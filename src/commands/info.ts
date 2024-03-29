/* eslint-disable import/no-default-export */

import {flags} from '@oclif/command';
import {
	NAME as ZS_EXTRACT_NAME,
	VERSION as ZS_EXTRACT_VERSION
} from 'zs-extract';

import {NAME, VERSION} from '../meta';
import {Command} from '../command';

/**
 * Info command.
 */
export class Info extends Command {
	/**
	 * Description.
	 */
	public static readonly description = 'display info about program';

	/**
	 * Examples.
	 */
	public static readonly examples = [];

	/**
	 * Flags.
	 */
	public static readonly flags = {
		help: flags.help({char: 'h'})
	};

	/**
	 * Arguments.
	 */
	public static readonly args = [];

	/**
	 * Handler.
	 */
	// eslint-disable-next-line @typescript-eslint/require-await
	public async run() {
		this.parse(Info);

		this.log('Version:');
		this.log(`  ${NAME}: ${VERSION}`);

		this.log('');

		this.log('Library versions:');
		for (const info of [[ZS_EXTRACT_NAME, ZS_EXTRACT_VERSION]]) {
			this.log(`  ${info[0]}: ${info[1]}`);
		}

		this.log('');
	}
}
export default Info;
