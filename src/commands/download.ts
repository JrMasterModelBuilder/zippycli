/* eslint-disable import/no-default-export */

import {join as pathJoin} from 'path';

import {flags} from '@oclif/command';
import fse from 'fs-extra';
import {extract} from 'zs-extract';

import {
	PARTIAL_FILE_PREFIX,
	DEFAULT_TIMEOUT,
	DEFAULT_UPDATE_INTERVAL
} from '../constants';
import {
	fstat,
	parseDate,
	pipelineP,
	dateHumanTimestamp
} from '../util';
import {Progress} from '../progress';
import {Command} from '../command';
import {IRequestFactory, IRequestResponse} from '../request';

/**
 * Download command.
 */
export default class Download extends Command {
	/**
	 * Aliases.
	 */
	public static readonly aliases = [
		'dl',
		'd'
	];

	/**
	 * Description.
	 */
	public static readonly description = 'download file from source';

	/**
	 * Examples.
	 */
	public static readonly examples = [];

	/**
	 * Flags.
	 */
	public static readonly flags = {
		help: flags.help({char: 'h'}),
		output: flags.string({
			char: 'o',
			description: 'output file'
		}),
		dir: flags.string({
			char: 'd',
			description: 'output directory'
		}),
		input: flags.boolean({
			char: 'i',
			description: 'source is input file with a URL on each line'
		}),
		mtime: flags.boolean({
			char: 'm',
			description: 'use server modified time if available'
		}),
		timeout: flags.integer({
			char: 't',
			description: 'request timeout in seconds',
			default: DEFAULT_TIMEOUT
		}),
		update: flags.integer({
			char: 'u',
			description: 'update interval in milliseconds',
			default: DEFAULT_UPDATE_INTERVAL
		})
	};

	/**
	 * Arguments.
	 */
	public static readonly args = [
		{
			name: 'source',
			required: true,
			description: 'source to download from'
		}
	];

	/**
	 * Handler.
	 */
	public async run() {
		const {args, flags} = this.parse(Download);
		const source = args.source as string;
		const {timeout, update} = flags;
		const mtime = flags.mtime || false;
		const outdir = flags.dir || '';
		const file = flags.output || '';
		const input = flags.input || false;
		if (file && input) {
			throw new Error('Both file and input arguments found');
		}

		const sources = flags.input ?
			await this._readInputFile(source) :
			[source];

		const req = this._initRequest(timeout * 1000);

		let errors = false;

		for (let i = 0; i < sources.length; i++) {
			const source = sources[i];
			if (i) {
				this.log('');
			}

			try {
				// eslint-disable-next-line no-await-in-loop
				await this._handleSource(
					source,
					outdir,
					file,
					mtime,
					update,
					req
				);
			}
			catch (err) {
				errors = true;
				this.log(`error: ${err}`);
			}
		}

		if (errors) {
			this.exit(1);
		}
	}

	/**
	 * Handle an individual source.
	 *
	 * @param source The source.
	 * @param outdir Output dir.
	 * @param outfile Output files.
	 * @param mtime Modification time.
	 * @param updateInterval Update interval.
	 * @param req Request factory.
	 */
	protected async _handleSource(
		source: string,
		outdir: string,
		outfile: string,
		mtime: boolean,
		updateInterval: number,
		req: IRequestFactory
	) {
		this.log(`source: ${source}`);

		const info = await extract(source, req);
		const {download} = info;
		const filename = outfile || info.filename;

		if (!filename) {
			throw new Error('No filename extracted or specified');
		}

		this.log(`download: ${download}`);
		this.log(`filename: ${filename}`);

		if (outdir) {
			this.log(`dir: ${outdir}`);
		}
		const filepath = outdir ? pathJoin(outdir, filename) : filename;

		// Get file stat and size if a file.
		const stat = await fstat(filepath);

		// If path already exists, and is not file, then error.
		if (stat && !stat.isFile()) {
			throw new Error('Output filename already exists');
		}

		// Make a HEAD request to the download URL, to get file headers.
		const headResponse = await new Promise<IRequestResponse>(
			(resolve, reject) => {
				req({
					url: download,
					method: 'HEAD'
				}, (err, response) => {
					if (err) {
						reject(err);
						return;
					}
					resolve(response);
				});
			}
		);

		// Verify the status code.
		const {statusCode} = headResponse;
		if (statusCode !== 200) {
			throw new Error(`Invalid status code: ${statusCode}`);
		}

		// Read headers.
		const contentLength = headResponse.headers['content-length'];
		const acceptRanges = headResponse.headers['accept-ranges'];
		const lastModified = headResponse.headers['last-modified'];
		this.log(`content-length: ${contentLength}`);
		this.log(`accept-ranges: ${acceptRanges}`);
		this.log(`last-modified: ${lastModified}`);

		// Parse the content-length header.
		const contentLengthI = parseInt(contentLength || '', 10);

		// If path exists and is file, verify size.
		if (stat) {
			if (contentLengthI || contentLengthI === 0) {
				if (contentLengthI === stat.size) {
					this.log('done: Already retrieved');
					return;
				}
				throw new Error(`Invalid existing file size: ${stat.size}`);
			}
			throw new Error('Could not verify correct file size');
		}

		// Determine if possible to resume any partial downloads.
		const canResume = acceptRanges === 'bytes';

		// Parse the date modified.
		const dateModified = parseDate(lastModified || '');

		// Create part file name.
		const partFilename = this._partialFilename(filename);
		const partFilepath = outdir ?
			pathJoin(outdir, partFilename) : partFilename;
		this.log(`filename-partial: ${partFilename}`);

		// Stat the part file if exists, throw if not file.
		const partFileStat = await fstat(partFilepath);
		if (partFileStat && !partFileStat.isFile()) {
			throw new Error('Partial file path exists but not a file');
		}

		// Get offset to resume download from if possible.
		const resumeFrom = canResume && partFileStat ? partFileStat.size : 0;
		if (resumeFrom) {
			this.log(`resume-from: ${resumeFrom}`);
		}
		if (resumeFrom > contentLengthI) {
			throw new Error(`Partial larger than expected: ${resumeFrom}`);
		}

		// Open the file for append if resuming, else write.
		await fse.ensureFile(partFilepath);
		const file = fse.createWriteStream(partFilepath, {
			flags: resumeFrom ? 'a' : 'w'
		});

		// Only download if partial file is not complete.
		if (contentLengthI && resumeFrom !== contentLengthI) {
			this.log(`download-start: ${dateHumanTimestamp()}`);

			// Start a progress monitor.
			const progress = new Progress(contentLengthI, resumeFrom);
			progress.start(updateInterval, this._transferProgressOutputInit());

			// Start download, monitoring progress.
			const dl = this._download(
				file,
				download,
				req,
				resumeFrom
			);
			dl.stream.on('data', data => {
				progress.add(data.length);
			});

			// Await completion.
			try {
				await dl.complete;
			}
			finally {
				progress.end();
				this._transferProgressOutputAfter();
			}

			this.log(`download-end: ${dateHumanTimestamp()}`);
		}
		// Otherwise just close file.
		else {
			this.log('already-complete: partial file already complete');

			await new Promise(resolve => {
				file.end(resolve);
			});
		}

		this.log(`verify-size: ${contentLengthI}`);

		// Verify partial file size after download.
		const partFileDoneStat = await fstat(partFilepath);
		if (!partFileDoneStat || !partFileDoneStat.isFile()) {
			throw new Error('Failed to verify download file size');
		}
		if (partFileDoneStat.size !== contentLengthI) {
			const {size} = partFileDoneStat;
			throw new Error(`Unexpected download size: ${size}`);
		}

		// Set mtime if requested and available.
		if (dateModified && mtime) {
			const time = dateModified.getTime() / 1000;
			this.log(`setting-mtime: ${time}`);
			await fse.utimes(partFilepath, time, time);
		}

		// Move partial.
		this.log(`saving-partial: ${partFilename}`);
		await fse.move(partFilepath, filepath);

		// All done.
		this.log(`done: ${filename}`);
	}

	/**
	 * Download file to a file stream.
	 *
	 * @param file File stream.
	 * @param url Download URL.
	 * @param req Request factory.
	 * @param resume Resume offset.
	 * @returns Stream object and a complete promise.
	 */
	protected _download(
		file: fse.WriteStream,
		url: string,
		req: IRequestFactory,
		resume: number
	) {
		const headers: {[key: string]: string} = {};
		if (resume) {
			headers.Range = `bytes=${resume}-`;
		}
		const statusCodeExpected = resume ? 206 : 200;

		let error: Error | null = null;

		const stream = req({
			url,
			headers
		});
		stream.once('response', response => {
			const {statusCode} = response;
			if (statusCode === statusCodeExpected) {
				return;
			}
			stream.abort();
			error = new Error(`Invalid status code: ${statusCode}`);
		});
		const complete = pipelineP(stream as any, file)
			.then(() => {
				if (error) {
					throw error;
				}
			})
			.catch(err => {
				throw error || err;
			});

		return {
			stream,
			complete
		};
	}

	/**
	 * Get a partial name from filename.
	 *
	 * @param filename The filename.
	 * @returns Partial name.
	 */
	protected _partialFilename(filename: string) {
		return `${PARTIAL_FILE_PREFIX}${filename}`;
	}
}
