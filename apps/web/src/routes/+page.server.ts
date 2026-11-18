import { getReader } from '#lib/server/reader.ts';
import type { PageServerLoad } from './$types';

/** Tell the page whether a model is set up, so it only calls the server when there is one. */
export const load: PageServerLoad = () => ({ reader: getReader()?.name ?? null });
