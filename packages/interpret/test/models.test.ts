import Anthropic from '@anthropic-ai/sdk';
import { EXPRESSIONS, POSES, PRIMITIVES, THING_KINDS } from '@crayon-o-matic/core';
import { describe, expect, it, vi } from 'vitest';
import { claudeInterpreter, type MessagesClient } from '../src/claude.js';
import { interpretWithFallback, tidyScene } from '../src/interpreter.js';
import { localInterpreter } from '../src/local.js';
import { MAX_MOTIF, SCENE_JSON_SCHEMA, SYSTEM_PROMPT, userMessage } from '../src/prompt.js';

const SCENE = {
	title: 'a llama doing taxes',
	kidSays: 'the llama is doing sums',
	things: [
		{ id: 'llama', label: 'llama', kind: 'animal4', importance: 1, expression: 'meh', parts: [{ name: 'head', primitive: 'loop' }, { name: 'legs', primitive: 'line', count: 4 }, { name: 'sign', primitive: 'box' }] },
		{ id: 'Big Pile', label: 'papers', kind: 'object', importance: 1.4, expression: 'none', relation: { to: 'llama', how: 'next-to' }, parts: [{ name: 'paper', primitive: 'box' }] }
	],
	extras: ['sun']
};

const message = (text: string, stop: Anthropic.Message['stop_reason'] = 'end_turn'): Anthropic.Message =>
	({ id: 'msg', type: 'message', role: 'assistant', model: 'm', content: [{ type: 'text', text, citations: null }], stop_reason: stop, stop_sequence: null, usage: {} }) as unknown as Anthropic.Message;

function fakeClaude(reply: Anthropic.Message | Error) {
	const create = vi.fn(async () => {
		if (reply instanceof Error) throw reply;
		return reply;
	});
	return { client: { messages: { create } } as unknown as MessagesClient, create };
}

function fakeFetch(status: number, body: unknown) {
	return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

describe('prompt and schema', () => {
	it('the schema allows exactly the vocabulary the engine can draw', () => {
		const thing = (SCENE_JSON_SCHEMA.properties as any).things.items.properties;
		expect(thing.kind.enum).toEqual([...THING_KINDS]);
		expect(thing.expression.enum).toEqual([...EXPRESSIONS]);
		expect(thing.pose.enum).toEqual([...POSES]);
		expect(thing.parts.items.properties.primitive.enum).toEqual([...PRIMITIVES]);
	});

	it('the prompt forbids text in the drawing and stays small', () => {
		expect(SYSTEM_PROMPT).toMatch(/never include letters, words/i);
		expect(SYSTEM_PROMPT.length).toBeLessThan(3000);
	});

	it('motifs are cut to length and stripped of control characters', () => {
		const msg = userMessage(`a cat\u0000${'x'.repeat(500)}`);
		expect(msg).not.toContain('\u0000');
		expect(msg.length).toBeLessThanOrEqual('Motif: '.length + MAX_MOTIF);
	});
});

describe('tidyScene', () => {
	it('fixes ids, clamps importance and keeps relations pointing at the right thing', () => {
		const tidy = tidyScene(SCENE) as typeof SCENE;
		expect(tidy.things[1]!.id).toBe('big-pile');
		expect(tidy.things[1]!.importance).toBe(1);
		expect(tidy.things[1]!.relation!.to).toBe('llama');
	});
});

describe('claude interpreter', () => {
	it('asks the small model at low effort with the scene schema, and strips text parts', async () => {
		const { client, create } = fakeClaude(message(JSON.stringify(SCENE)));
		const scene = await claudeInterpreter({ client }).interpret('a llama doing taxes');
		const body = (create.mock.calls[0] as unknown[])[0] as Anthropic.MessageCreateParamsNonStreaming;
		expect(body.model).toBe('claude-haiku-5-5');
		expect(body.output_config).toEqual({ effort: 'low', format: { type: 'json_schema', schema: SCENE_JSON_SCHEMA } });
		expect(scene.things[0]!.parts.map((p) => p.name)).toEqual(['head', 'legs']);
	});

	it('the expression override wins over the model', async () => {
		const { client } = fakeClaude(message(JSON.stringify(SCENE)));
		const scene = await claudeInterpreter({ client }).interpret('a llama', { expression: 'smirk' });
		expect(scene.things[0]!.expression).toBe('smirk');
	});

	it('a refusal, a cut-off answer or broken JSON is an error, not a drawing', async () => {
		for (const reply of [message('{}', 'refusal'), message('{"title":', 'max_tokens'), message('not json')]) {
			await expect(claudeInterpreter({ client: fakeClaude(reply).client }).interpret('x')).rejects.toThrow();
		}
	});

	it('a rejected key gives a short reason without the key', async () => {
		const err = new Anthropic.AuthenticationError(401, { error: { message: 'invalid x-api-key sk-ant-secret' } }, 'invalid x-api-key sk-ant-secret', new Headers());
		await expect(claudeInterpreter({ client: fakeClaude(err).client }).interpret('x')).rejects.toThrow('the API key was rejected');
	});
});

describe('local interpreter', () => {
	it('posts an OpenAI-compatible chat request with the schema, and reads a fenced answer', async () => {
		const f = fakeFetch(200, { choices: [{ message: { content: '```json\n' + JSON.stringify(SCENE) + '\n```' }, finish_reason: 'stop' }] });
		const scene = await localInterpreter({ model: 'qwen2.5:3b', fetch: f as unknown as typeof fetch }).interpret('a llama');
		const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
		const body = JSON.parse(init.body as string);
		expect(url).toBe('http://localhost:11434/v1/chat/completions');
		expect(body.model).toBe('qwen2.5:3b');
		expect(body.response_format.json_schema.schema).toEqual(SCENE_JSON_SCHEMA);
		expect(scene.things[0]!.label).toBe('llama');
	});

	it('needs a model name', () => {
		expect(() => localInterpreter({ model: ' ' })).toThrow(/model/);
	});

	it('a server error or an unreachable server is a short error', async () => {
		await expect(localInterpreter({ model: 'm', fetch: fakeFetch(500, {}) as unknown as typeof fetch }).interpret('x')).rejects.toThrow('answered 500');
		const down = vi.fn(async () => {
			throw new TypeError('fetch failed');
		});
		await expect(localInterpreter({ model: 'm', fetch: down as unknown as typeof fetch }).interpret('x')).rejects.toThrow(/could not reach/);
	});
});

describe('fallback', () => {
	it('when the model fails, the offline templates draw instead and say why', async () => {
		const result = await interpretWithFallback(claudeInterpreter({ client: fakeClaude(message('nope')).client }), 'a cat');
		expect(result.source).toBe('offline');
		expect(result.fallbackReason).toMatch(/claude-haiku-5-5: .*JSON/);
		expect(result.scene.things[0]!.label).toBe('cat');
	});

	it('when the model works, its scene is used', async () => {
		const result = await interpretWithFallback(claudeInterpreter({ client: fakeClaude(message(JSON.stringify(SCENE))).client }), 'a llama');
		expect(result.source).toBe('claude-haiku-5-5');
		expect(result.fallbackReason).toBeUndefined();
	});
});

describe('rules over the model', () => {
	const scene = (things: object[]) => JSON.stringify({ title: 't', kidSays: 'k', things, extras: [] });

	it('a thing the templates know gets their parts, plus the model\'s own extras', async () => {
		const reply = scene([{ id: 'mum', label: 'mum', kind: 'person', importance: 1, expression: 'happy', parts: [{ name: 'head', primitive: 'loop' }, { name: 'hat', primitive: 'tab' }] }]);
		const out = await claudeInterpreter({ client: fakeClaude(message(reply)).client }).interpret('my mum at the beach');
		const names = out.things[0]!.parts.map((p) => p.name);
		expect(names).toContain('legs');
		expect(names).toContain('hat');
		expect(names.indexOf('head')).toBe(0);
	});

	it('a mood word in the motif beats the model\'s guess', async () => {
		const reply = scene([{ id: 'robot', label: 'robot', kind: 'person', importance: 1, expression: 'sad', parts: [{ name: 'head', primitive: 'loop' }] }]);
		const out = await claudeInterpreter({ client: fakeClaude(message(reply)).client }).interpret('a grumpy robot');
		expect(out.things[0]!.expression).toBe('smirk');
	});

	it('the template decides the kind, and a pose the template can\'t do is dropped', async () => {
		const reply = scene([{ id: 'cat', label: 'cat', kind: 'blob', importance: 1, expression: 'happy', pose: 'flying', parts: [{ name: 'body', primitive: 'loop' }] }]);
		const out = await claudeInterpreter({ client: fakeClaude(message(reply)).client }).interpret('a cat');
		expect(out.things[0]!.kind).toBe('animal4');
		expect(out.things[0]!.pose).toBeUndefined();
	});
});
