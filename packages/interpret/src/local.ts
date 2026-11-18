/**
 * The local interpreter: your own model behind an OpenAI-compatible chat endpoint, which
 * Ollama, llama.cpp's server, vLLM and LM Studio all offer. Nothing leaves your machine
 * unless you point it elsewhere.
 *
 *   CRAYON_LOCAL_URL    default http://localhost:11434/v1 (Ollama)
 *   CRAYON_LOCAL_MODEL  required, e.g. llama3.2:3b or qwen2.5:3b
 *   CRAYON_LOCAL_KEY    optional bearer token
 *
 * The output schema goes along as response_format; servers that can't constrain output
 * still get the schema-shaped example in the prompt, and every answer is validated anyway.
 */
import type { ConceptScene } from '@crayon-o-matic/core';
import { sceneFromModelText, type InterpretOptions, type Interpreter } from './interpreter.js';
import { withRules } from './rules.js';
import { SCENE_JSON_SCHEMA, SYSTEM_PROMPT, userMessage } from './prompt.js';

export const DEFAULT_LOCAL_URL = 'http://localhost:11434/v1';
/** Small local models on a CPU can be slow; past this the offline templates take over. */
const TIMEOUT_MS = 120_000;
const MAX_TOKENS = 2000;

export interface LocalOptions {
	model: string;
	baseUrl?: string;
	apiKey?: string;
	/** For tests, or a fetch with its own agent. */
	fetch?: typeof fetch;
}

interface ChatCompletion {
	choices?: { message?: { content?: unknown }; finish_reason?: string }[];
}

function contentOf(body: ChatCompletion): string {
	const choice = body.choices?.[0];
	if (choice?.finish_reason === 'length') throw new Error('the answer was cut off');
	const content = choice?.message?.content;
	if (typeof content !== 'string' || !content.trim()) throw new Error('the model returned no text');
	// some models wrap JSON in a code fence despite being asked not to
	return content.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
}

export function localInterpreter(options: LocalOptions): Interpreter {
	if (!options.model?.trim()) throw new Error('local interpreter: set a model (CRAYON_LOCAL_MODEL)');
	const base = (options.baseUrl ?? DEFAULT_LOCAL_URL).replace(/\/+$/, '');
	const doFetch = options.fetch ?? fetch;
	return {
		name: `local:${options.model}`,
		async interpret(motif: string, opts: InterpretOptions = {}): Promise<ConceptScene> {
			const signal = opts.signal ? AbortSignal.any([opts.signal, AbortSignal.timeout(TIMEOUT_MS)]) : AbortSignal.timeout(TIMEOUT_MS);
			let res: Response;
			try {
				res = await doFetch(`${base}/chat/completions`, {
					method: 'POST',
					headers: { 'content-type': 'application/json', ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}) },
					body: JSON.stringify({
						model: options.model,
						max_tokens: MAX_TOKENS,
						temperature: 0.4,
						messages: [
							{ role: 'system', content: SYSTEM_PROMPT },
							{ role: 'user', content: userMessage(motif, opts.expression) }
						],
						response_format: { type: 'json_schema', json_schema: { name: 'concept_scene', schema: SCENE_JSON_SCHEMA } }
					}),
					signal
				});
			} catch (err) {
				const timedOut = err instanceof Error && err.name === 'TimeoutError';
				throw new Error(timedOut ? 'the local model took too long' : `could not reach the local model at ${base}`);
			}
			if (!res.ok) throw new Error(`the local model server answered ${res.status}`);
			let body: ChatCompletion;
			try {
				body = (await res.json()) as ChatCompletion;
			} catch {
				throw new Error('the local model server did not return JSON');
			}
			return withRules(sceneFromModelText(contentOf(body)), motif, opts.expression);
		}
	};
}
