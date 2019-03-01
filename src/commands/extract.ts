import {flags} from '@oclif/command';
import request from 'request';
import {extract} from 'zs-extract';

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
	public static description = 'extract data about download';

	/**
	 * Examples.
	 */
	public static examples = [];

	/**
	 * Flags.
	 */
	public static flags = {
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
			default: 10
		})
	};

	/**
	 * Arguments.
	 */
	public static args = [
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
		// tslint:disable-next-line: no-unused
		const {args, flags} = this.parse(Extract);
		const source = args.source as string;
		const format = flags.format as string;
		const timeout = flags.timeout as number;

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
				this.log('  }' + (i + 1 === sources.length ? '' : ','));
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

		const {download, filename} = await extract(source, req);

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
