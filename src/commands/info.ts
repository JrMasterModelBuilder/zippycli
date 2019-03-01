import {flags} from '@oclif/command';
import {
	NAME as ZS_EXTRACT_NAME,
	VERSION as ZS_EXTRACT_VERSION
} from 'zs-extract';

import {
	NAME,
	VERSION
} from '../meta';
import {Command} from '../command';

/**
 * Info command.
 */
export default class Info extends Command {
	/**
	 * Description.
	 */
	public static description = 'display info about program';

	/**
	 * Examples.
	 */
	public static examples = [];

	/**
	 * Flags.
	 */
	public static flags = {
		help: flags.help({char: 'h'})
	};

	/**
	 * Arguments.
	 */
	public static args = [];

	/**
	 * Handler.
	 */
	public async run() {
		// tslint:disable-next-line: no-unused
		const {args, flags} = this.parse(Info);

		this.log('Version:');
		this.log(`  ${NAME}: ${VERSION}`);

		this.log('');

		this.log('Library versions:');
		for (const info of [
			[ZS_EXTRACT_NAME, ZS_EXTRACT_VERSION]
		]) {
			this.log(`  ${info[0]}: ${info[1]}`);
		}

		this.log('');
	}
}
