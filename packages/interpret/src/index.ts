/** Browser-safe: offline templates, schema, rules. Model adapters are in ./server. */
export { ConceptSceneSchema, ThingSchema, PartSchema, parseScene, withoutText } from './schema.js';
export { interpretOffline, KNOWN_WORDS, type OfflineOptions } from './offline.js';
export { TEMPLATES, templateFor, type Template } from './templates.js';
export { SYSTEM_PROMPT, SCENE_JSON_SCHEMA, MAX_MOTIF, userMessage, cleanMotif } from './prompt.js';
export { offlineInterpreter, interpretWithFallback, sceneFromModelText, tidyScene, type Interpreter, type Interpreted, type InterpretOptions } from './interpreter.js';
export { withRules } from './rules.js';
