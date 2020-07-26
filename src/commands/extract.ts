/* eslint-disable import/no-default-export */

import {flags} from '@oclif/command';
import request from 'request';
import {extract} from 'zs-extract';

import {
	DEFAULT_TIMEOUT
} from '../constants';
import {Command} from '../command';

const jsonE = (v: any) => JSON.stringify(v);

/**
 * Extract command.
 */
export default class Extract extends Command {
	/**
	 * Aliases.
	 */
	public static readonly aliases = [
		'ex',
		'e'
	];

	/**
	 * Description.
	 */
	public static readonly description = 'extract data about download';

	/**
	 * Examples.
	 */
	public static readonly examples = [];

	/**
	 * Flags.
	 */
	public static readonly flags = {
		help: flags.help({char: 'h'}),
		format: flags.string({
			char: 'f',
			description: 'output format',
			options: ['text', 'json'],
			default: 'text'
		}),
		input: flags.boolean({
			char: 'i',
			description: 'source is input file with a URL on each line'
		}),
		timeout: flags.integer({
			char: 't',
			description: 'request timeout in seconds',
			default: DEFAULT_TIMEOUT
		})
	};

	/**
	 * Arguments.
	 */
	public static readonly args = [
		{
			name: 'source',
			required: true,
			description: 'source to extract from'
		}
	];

	/**
	 * Handler.
	 */
	public async run() {
		const {args, flags} = this.parse(Extract);
		const source = args.source as string;
		const {format, timeout} = flags;

		const isJSON = format === 'json';
		const sources = flags.input ?
			await this._readInputFile(source) :
			[source];

		const req = this._initRequest(timeout * 1000);

		let errors = false;

		if (isJSON) {
			this.log('[');
		}

		for (let i = 0; i < sources.length; i++) {
			const source = sources[i];
			if (isJSON) {
				this.log('  {');
			}
			else if (i) {
				this.log('');
			}

			try {
				// eslint-disable-next-line no-await-in-loop
				await this._handleSource(source, req, format);
			}
			catch (err) {
				errors = true;
				const error = String(err);
				if (isJSON) {
					this.log(`    "error": ${jsonE(error)}`);
				}
				else {
					this.log(`error: ${error}`);
				}
			}

			if (isJSON) {
				const c = i + 1 === sources.length ? '' : ',';
				this.log(`  }${c}`);
			}
		}

		if (isJSON) {
			this.log(']');
		}

		if (errors) {
			this.exit(1);
		}
	}

	/**
	 * Handle an individual source.
	 *
	 * @param source The source.
	 * @param req Request object.
	 * @param format Output format.
	 */
	protected async _handleSource(
		source: string,
		req: typeof request,
		format: string
	) {
		const isJSON = format === 'json';

		if (isJSON) {
			this.log(`    "source": ${jsonE(source)},`);
		}
		else {
			this.log(`source: ${source}`);
		}

		const {download, filename} = await extract(source, req as any);

		if (isJSON) {
			this.log(`    "download": ${jsonE(download)},`);
			this.log(`    "filename": ${jsonE(filename)}`);
		}
		else {
			this.log(`download: ${download}`);
			this.log(`filename: ${filename || ''}`);
		}
	}
}
