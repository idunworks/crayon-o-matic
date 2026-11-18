/**
 * The Claude interpreter: your own Anthropic API key (ANTHROPIC_API_KEY, or any credential
 * the SDK finds). The key is only ever read server-side by the SDK; never ship it to a browser.
 *
 * Defaults to the smallest current model at low effort (owner, 2026-11-18: lower is better).
 * The scene is small, so a bigger model is a setting, not a code change.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { ConceptScene } from '@crayon-o-matic/core';
import { sceneFromModelText, type InterpretOptions, type Interpreter } from './interpreter.js';
import { withRules } from './rules.js';
import { SCENE_JSON_SCHEMA, SYSTEM_PROMPT, userMessage } from './prompt.js';

export const DEFAULT_CLAUDE_MODEL = 'claude-haiku-5-5';
type Effort = 'low' | 'medium' | 'high';
/** Room for adaptive thinking plus a scene of a few hundred tokens. */
const MAX_TOKENS = 8000;
const TIMEOUT_MS = 60_000;

/** The one SDK call this interpreter makes; tests pass a stand-in. */
export interface MessagesClient {
	messages: { create(body: Anthropic.MessageCreateParamsNonStreaming, opts?: Anthropic.RequestOptions): Promise<Anthropic.Message> };
}

export interface ClaudeOptions {
	model?: string;
	effort?: Effort;
	/** Defaults to `new Anthropic()`, which reads the key from the environment. */
	client?: MessagesClient;
}

/** A short, key-free reason for a failed call. */
function explain(err: unknown): Error {
	if (err instanceof Anthropic.AuthenticationError) return new Error('the API key was rejected');
	if (err instanceof Anthropic.PermissionDeniedError) return new Error('the API key may not use this model');
	if (err instanceof Anthropic.RateLimitError) return new Error('rate limited, try again later');
	if (err instanceof Anthropic.APIConnectionError) return new Error('could not reach the Claude API');
	if (err instanceof Anthropic.APIError) return new Error(`Claude API error ${err.status ?? ''}`.trim());
	return err instanceof Error ? err : new Error(String(err));
}

function textOf(message: Anthropic.Message): string {
	if (message.stop_reason === 'refusal') throw new Error('the model declined this motif');
	if (message.stop_reason === 'max_tokens') throw new Error('the answer was cut off');
	return message.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
}

export function claudeInterpreter(options: ClaudeOptions = {}): Interpreter {
	const model = options.model ?? DEFAULT_CLAUDE_MODEL;
	let client = options.client;
	return {
		name: model,
		async interpret(motif: string, opts: InterpretOptions = {}): Promise<ConceptScene> {
			client ??= new Anthropic();
			let message: Anthropic.Message;
			try {
				message = await client.messages.create(
					{
						model,
						max_tokens: MAX_TOKENS,
						system: SYSTEM_PROMPT,
						messages: [{ role: 'user', content: userMessage(motif, opts.expression) }],
						output_config: { effort: options.effort ?? 'low', format: { type: 'json_schema', schema: SCENE_JSON_SCHEMA } }
					},
					{ timeout: TIMEOUT_MS, ...(opts.signal ? { signal: opts.signal } : {}) }
				);
			} catch (err) {
				throw explain(err);
			}
			return withRules(sceneFromModelText(textOf(message)), motif, opts.expression);
		}
	};
}
