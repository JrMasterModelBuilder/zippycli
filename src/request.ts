import {Readable} from 'stream';

import fetch from 'node-fetch';
import AbortController from 'abort-controller';

export interface IRequestDefaults {

	/**
	 * Request method.
	 */
	method?: string;

	/**
	 * Request headers.
	 */
	headers?: {[key: string]: string};

	/**
	 * Gzip compression.
	 */
	gzip?: boolean;

	/**
	 * Body encoding used for callback functions.
	 */
	encoding?: string | null;

	/**
	 * Request timeout.
	 */
	timeout?: number;
}

export interface IRequestOptions extends IRequestDefaults {

	/**
	 * URL string.
	 */
	url: string;
}

export interface IRequestResponse {

	/**
	 * Status code.
	 */
	statusCode: number;

	/**
	 * Response headers, all lowercase.
	 */
	headers: {[key: string]: string};
}

export interface IRequestStream extends Readable {
	on(event: 'error', listener: (e: Error) => void): this;
	on(event: 'response', listener: (resp: IRequestResponse) => void): this;
	on(event: 'data', listener: (data: Buffer | string) => void): this;
	// eslint-disable-next-line @typescript-eslint/unified-signatures
	on(event: 'complete', listener: (resp: IRequestResponse) => void): this;
	on(event: string | symbol, listener: (...args: any[]) => void): this;
	abort(): void;
}

export type IRequestCallback = (
	error: any,
	response: IRequestResponse,
	body: any
) => void;

export type IRequestFactory = (
	options: IRequestOptions,
	cb?: IRequestCallback
) => IRequestStream;

/**
 * RequestStream, similar to the deprecated request module stream.
 *
 * @param options Request options.
 */
export class RequestStream extends Readable {
	/**
	 * Request options.
	 */
	private _options_: Readonly<IRequestOptions> | null;

	/**
	 * Abort controller.
	 */
	private _abortController_: AbortController | null = null;

	constructor(options: Readonly<IRequestOptions>) {
		super();

		this._options_ = options;
	}

	/**
	 * Abort request.
	 */
	public abort() {
		this.destroy();
	}

	/**
	 * Read implementation.
	 *
	 * @param _size Size to be read.
	 */
	// eslint-disable-next-line @typescript-eslint/naming-convention
	public _read(_size: number) {
		// Get options if set, only starts reading once.
		const options = this._options_;
		if (!options) {
			return;
		}
		this._options_ = null;

		fetch(options.url, {
			signal: (this._abortController_ = new AbortController()).signal,
			method: options.method || 'GET',
			headers: {
				'User-Agent': '-',
				...(options.headers || {})
			},
			compress: !!options.gzip,
			timeout: options.timeout
		}).then(
			res => {
				const {status, headers, body} = res;
				const headersRaw = headers.raw();
				const headersObject: {[key: string]: string} = {};
				for (const p of Object.keys(headersRaw)) {
					headersObject[p] = headersRaw[p].join(', ');
				}
				const response = {
					statusCode: status,
					headers: headersObject
				};
				body.on('error', err => {
					this.emit('error', err);
				});
				body.on('data', data => {
					this.push(data);
				});
				body.on('end', () => {
					this.push(null);
				});
				this.on('end', () => {
					this.emit('complete', response);
				});
				this.emit('response', response);
			},
			err => {
				this.emit('error', err);
			}
		);
	}

	/**
	 * Destroy implementation.
	 *
	 * @param error Error object.
	 * @param callback Callback function.
	 */
	// eslint-disable-next-line @typescript-eslint/naming-convention
	public _destroy(
		error: Error | null,
		callback: (error?: Error | null) => void
	) {
		const abortController = this._abortController_;
		this._abortController_ = null;
		if (abortController) {
			abortController.abort();
		}

		super._destroy(error, callback);
	}

	/**
	 * Request factory.
	 *
	 * @param defaults Default options.
	 * @returns Request factory.
	 */
	public static factory(
		defaults: Readonly<IRequestDefaults> = {}
	): IRequestFactory {
		const Constructor = this as any as typeof RequestStream;
		return (
			options: Readonly<IRequestOptions>,
			cb?: IRequestCallback
		) => {
			const opts = {defaults, ...options};
			const request = new Constructor(opts);
			if (cb) {
				let response: IRequestResponse = {
					statusCode: 0,
					headers: {}
				};
				const datas: Buffer[] = [];
				request.on('response', resp => {
					response = resp;
				});
				request.on('data', data => {
					datas.push(data);
				});
				request.on('error', err => {
					request.abort();
					cb(err, response, Buffer.concat(datas));
				});
				request.on('complete', resp => {
					const data = Buffer.concat(datas);
					const {encoding} = opts;
					cb(
						null,
						resp,
						encoding === null ?
							data :
							data.toString(encoding as any)
					);
				});
			}
			return request;
		};
	}
}
