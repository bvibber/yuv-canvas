export class FrameSink {

	/**
	 * Create a YUVCanvas and attach it to an HTML5 canvas element.
	 *
	 * This will take over the drawing context of the canvas and may turn
	 * it into a WebGL 3d canvas if possible. Do not attempt to use the
	 * drawing context directly after this.
	 *
	 * @param {HTMLCanvasElement} canvas - HTML canvas element to attach to
	 * @param {YUVCanvasOptions} options - map of options
	 * @throws exception if WebGL requested but unavailable
	 * @constructor
	 * @abstract
	 */
	constructor(canvas, options={}) {
		this.canvas = canvas;
	}

	/**
	 * Draw a single YUV frame on the underlying canvas, converting to RGB.
	 * If necessary the canvas will be resized to the optimal pixel size
	 * for the given buffer's format.
	 *
	 * @param {YUVBuffer} buffer - the YUV buffer to draw
	 * @see {@link https://www.npmjs.com/package/yuv-buffer|yuv-buffer} for format
	 */
	drawFrame(buffer) {
		throw new Error('abstract');
	}

	/**
	 * Clear the canvas using appropriate underlying 2d or 3d context.
	 */
	clear() {
		throw new Error('abstract');
	}

}
