import {pipeline} from 'stream';
import {promisify} from 'util';

import {readFile, stat} from 'fs-extra';
import dateformat from 'dateformat';

export const pipelineP = promisify(pipeline);

/**
 * Integer division with remained.
 *
 * @param v Value.
 * @param d Divisor.
 * @returns Integer divided and remained.
 */
export function divmod(v: number, d: number) {
	return [Math.floor(v / d), v % d];
}

/**
 * Parse date or return null is not valid.
 *
 * @param str Date string.
 * @returns Date object or null.
 */
export function parseDate(str: string) {
	const d = new Date(str);
	const t = d.getTime();

	// Test if the time is NaN (NaN !== NaN).
	// eslint-disable-next-line no-self-compare
	return t === t ? d : null;
}

/**
 * Get environment variable value.
 *
 * @param name Environment name.
 * @returns String value or null.
 */
export function env(name: string) {
	// eslint-disable-next-line no-process-env
	const v = process.env[name];
	return typeof v === 'undefined' ? null : v;
}

/**
 * Check if the environment variable value is true.
 *
 * @param name Environment name.
 * @returns String value is a true-like value.
 */
export function envTrue(name: string) {
	const v = env(name);
	return v && /^(1|true|yes)$/i.test(v);
}

/**
 * Stat path or return null if path does not exist.
 *
 * @param filepath File path.
 * @returns Stat object or null.
 */
export async function fstat(filepath: string) {
	try {
		return await stat(filepath);
	}
	catch (err) {
		// Ignore it.
	}
	return null;
}

/**
 * Read input file to list all URL's line by line.
 *
 * @param filepath Input file.
 * @returns URL list.
 */
export async function readInputFile(filepath: string) {
	const r: string[] = [];
	const data = await readFile(filepath, 'utf8');
	const lines = data.split(/[\r\n]+/);
	for (const line of lines) {
		const s = line.trim();
		if (/^https?:\/\//i.test(s)) {
			r.push(s);
		}
	}
	return r;
}

/**
 * Format date for human readable timestamps.
 *
 * @param date Date object or null.
 * @returns Date string.
 */
export function dateHumanTimestamp(date: Date | null = null) {
	const d = date || new Date();
	return dateformat(d, 'yyyy-mm-dd h:MM:ss');
}
