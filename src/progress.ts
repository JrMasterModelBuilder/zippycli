export interface IProgressTime {
	/**
	 * Start time.
	 */
	start: number;
	/**
	 * Current time.
	 */
	now: number;
	/**
	 * Current duration.
	 */
	duration: number;
	/**
	 * Delta since last update.
	 */
	delta: number;
}

export interface IProgressTotal {
	/**
	 * Total amount.
	 */
	total: number;
	/**
	 * Current amount.
	 */
	current: number;
	/**
	 * Remaining amount.
	 */
	remaining: number;
	/**
	 * Delta since last update.
	 */
	delta: number;
}

export type ProgressCallback = (
	time: IProgressTime,
	total: IProgressTotal
) => void;

/**
 * Progress wrapper.
 *
 * @param total Total progress.
 * @param current Starting progress.
 */
export class Progress extends Object {
	/**
	 * Total amount.
	 */
	protected _total: number;

	/**
	 * Current amount.
	 */
	protected _current: number;

	/**
	 * Update interval.
	 */
	protected _interval: any = null;

	/**
	 * Update callback.
	 */
	protected _callback: ProgressCallback | null = null;

	/**
	 * Start time.
	 */
	protected _start: number = 0;

	/**
	 * Previous update time.
	 */
	protected _prevTime: number = 0;

	/**
	 * Previous update total.
	 */
	protected _prevCurrent: number = 0;

	constructor(total: number, current: number = 0) {
		super();

		this._total = total;
		this._current = current;
		this._prevCurrent = current;
	}

	/**
	 * Get the current time.
	 */
	public now() {
		return Date.now();
	}

	/**
	 * Add to current amount.
	 *
	 * @param amount Amount to be added.
	 */
	public add(amount: number) {
		this._current += amount;
	}

	/**
	 * Start updater.
	 *
	 * @param interval Update interval in miliseconds.
	 * @param cb Progress callback.
	 */
	public start(
		interval: number,
		cb: ProgressCallback
	) {
		if (this._interval) {
			throw new Error('Already started');
		}

		const now = this.now();
		this._start = now;
		this._prevTime = now;
		this._callback = cb;

		this._interval = setInterval(() => {
			this.update();
		}, interval);
		this.update();
	}

	/**
	 * End updater.
	 */
	public end() {
		if (this._interval) {
			clearInterval(this._interval);
			this._interval = null;
		}
		this.update();
	}

	/**
	 * Update callback.
	 */
	public update() {
		const cb = this._callback;
		if (!cb) {
			return;
		}

		const start = this._start;
		const now = this.now();
		const duration = now - start;
		const timeDelta = now - this._prevTime;
		this._prevTime = now;

		const total = this._total;
		const current = this._current;
		const remaining = total - current;
		const totalDelta = current - this._prevCurrent;
		this._prevCurrent = current;

		cb(
			{
				start,
				now,
				duration,
				delta: timeDelta
			},
			{
				total,
				current,
				remaining,
				delta: totalDelta
			}
		);
	}
}
