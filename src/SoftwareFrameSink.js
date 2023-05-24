/*
Copyright (c) 2014-2023 Brion Vibber <brion@pobox.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
MPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import {FrameSink} from './FrameSink.js';
import {convertYCbCr} from './YCbCr.js';

const ctx = Symbol('ctx');
const imageData = Symbol('imageData');
const resampleCanvas = Symbol('resampleCanvas');
const resampleContext = Symbol('resampleContext');

const initImageData = Symbol('initImageData');
const initResampleCanvas = Symbol('initResampleCanvas');

export class SoftwareFrameSink extends FrameSink {
	/**
	 * @param {HTMLCanvasElement} canvas - HTML canvas element to attach to
	 * @param {Object?} options - optional options
	 */
	constructor(canvas, options={}) {
		super(canvas, options);
		this[ctx] = canvas.getContext('2d');
		this[imageData] = null;
		this[resampleCanvas] = null;
		this[resampleContext] = null;
	}

	[initImageData](width, height) {
		this[imageData] = this[ctx].createImageData(width, height);

		// Prefill the alpha to opaque
		const data = this[imageData].data,
			pixelCount = width * height * 4;
		for (let i = 0; i < pixelCount; i += 4) {
			data[i + 3] = 255;
		}
	}

	[initResampleCanvas](cropWidth, cropHeight) {
		this[resampleCanvas] = document.createElement('canvas');
		this[resampleCanvas].width = cropWidth;
		this[resampleCanvas].height = cropHeight;
		this[resampleContext] = this[resampleCanvas].getContext('2d');
	}

	/**
	 * Actually draw a frame into the canvas.
	 * @param {YUVFrame} buffer - YUV frame buffer object to draw
	 */
	drawFrame(buffer) {
		const canvas = this.canvas,
			imageData = this[imageData],
			format = buffer.format;

		if (canvas.width !== format.displayWidth || canvas.height !== format.displayHeight) {
			// Keep the canvas at the right size...
			canvas.width = format.displayWidth;
			canvas.height = format.displayHeight;
		}

		if (imageData === null ||
				imageData.width != format.width ||
				imageData.height != format.height) {
			this[initImageData](format.width, format.height);
		}

		// YUV -> RGB over the entire encoded frame
		convertYCbCr(buffer, imageData.data);

		const resample = (format.cropWidth != format.displayWidth || format.cropHeight != format.displayHeight);
		let drawContext;
		if (resample) {
			// hack for non-square aspect-ratio
			// putImageData doesn't resample, so we have to draw in two steps.
			if (!this[resampleCanvas]) {
				this[initResampleCanvas](format.cropWidth, format.cropHeight);
			}
			drawContext = this[resampleContext];
		} else {
			drawContext = this[ctx];
		}

		// Draw cropped frame to either the final or temporary canvas
		drawContext.putImageData(imageData,
			-format.cropLeft, -format.cropTop, // must offset the offset
			format.cropLeft, format.cropTop,
			format.cropWidth, format.cropHeight);

		if (resample) {
			this[ctx].drawImage(this[resampleCanvas], 0, 0, format.displayWidth, format.displayHeight);
		}
	};

	clear() {
		this[ctx].clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

}