import {Command as CommandBase} from '@oclif/command';
import {install as sourceMapSupportInstall} from 'source-map-support';

import {divmod, envTrue, readInputFile} from './util';
import {ProgressCallback} from './progress';
import {IRequestFactory, RequestStream} from './request';

/**
 * Command constructor.
 */
export abstract class Command extends CommandBase {
	/**
	 * Init function.
	 *
	 * @returns Returns the parent init.
	 */
	public async init() {
		if (envTrue('ZS_CLI_DEBUG_SOURCE_MAPS')) {
			sourceMapSupportInstall();
		}
		return super.init();
	}

	/**
	 * Check if the shell is interactive.
	 *
	 * @returns True if interactive shell, else false.
	 */
	protected _isInteractive() {
		return process.stdout.isTTY || false;
	}

	/**
	 * Init a request factory with the specified timeout.
	 *
	 * @param timeout Timeout duraction in milliseconds.
	 * @returns Request factory.
	 */
	protected _initRequest(timeout = 10000): IRequestFactory {
		return RequestStream.factory({
			timeout
		});
	}

	/**
	 * Read input file to list all URL's line by line.
	 *
	 * @param filepath Input file.
	 * @returns URL list.
	 */
	protected async _readInputFile(filepath: string) {
		return readInputFile(filepath);
	}

	/**
	 * Transfer seconds human readable.
	 *
	 * @param ms Milliseconds passed or null.
	 * @returns Formatted string.
	 */
	protected _transferSecondsHuman(ms: number | null) {
		if (ms === null) {
			return '-:--:--';
		}
		const seconds = Math.round(ms / 1000);
		const [minutes, s] = divmod(seconds, 60);
		const [h, m] = divmod(minutes, 60);
		const mStr = m < 10 ? `0${m}` : m;
		const sStr = s < 10 ? `0${s}` : s;
		return `${h}:${mStr}:${sStr}`;
	}

	/**
	 * Transfer bytes human readable.
	 *
	 * @param size Byte size.
	 * @returns Formatted string.
	 */
	protected _transferBytesHuman(size: number) {
		let based = size;
		const base = 1024;
		const names = ['B', 'K', 'M', 'G', 'T'];
		const il = names.length - 1;
		let i = 0;
		for (; based > base && i < il; i++) {
			based /= base;
		}
		return `${based.toFixed(2)}${names[i]}`;
	}

	/**
	 * Init data transfer progress output function.
	 *
	 * @returns Progress update callback function.
	 */
	protected _transferProgressOutputInit() {
		let messageLongest = 0;

		/**
		 * Progress callback.
		 *
		 * @param time Time.
		 * @param total Total.
		 */
		const r: ProgressCallback = (time, total) => {
			// Calcaulte the time spent.
			const timePast = this._transferSecondsHuman(time.duration);

			// Calcaulte progress.
			const progress = total.current / total.total;
			const percent = `${(progress * 100).toFixed(2)}%`;

			// Calculate amounts.
			const amountCurrent = this._transferBytesHuman(total.current);
			const amountTotal = this._transferBytesHuman(total.total);
			const amount = [
				`${amountCurrent} (${total.current})`,
				`${amountTotal} (${total.total})`
			].join(' / ');

			// Calculate speed.
			const bytesMs = time.delta ? total.delta / time.delta : 0;
			const bytesSec = `${this._transferBytesHuman(bytesMs * 1000)}/s`;

			// Estimate remaining.
			const timeLeftMs = bytesMs ? total.remaining / bytesMs : null;
			const timeETA = this._transferSecondsHuman(timeLeftMs);

			// Assemble message.
			const message = [timePast, percent, amount, bytesSec, timeETA].join(
				'  '
			);

			// Remember the longest message.
			messageLongest = Math.max(messageLongest, message.length);
			const messagePadded = message.padEnd(messageLongest, ' ');

			if (this._isInteractive()) {
				process.stdout.write(`\r${messagePadded}\r`);
			} else {
				this.log(messagePadded);
			}
		};
		return r;
	}

	/**
	 * Clear data transfer progress output after.
	 */
	protected _transferProgressOutputAfter() {
		if (this._isInteractive()) {
			this.log('');
		}
	}
}
