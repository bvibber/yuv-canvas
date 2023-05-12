/*
Copyright (c) 2023 Brion Vibber <brion@pobox.com>

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
(function() {
	"use strict";

	var FrameSink = require('./FrameSink.js');

	/**
	 * @param {HTMLCanvasElement} canvas - HTML canvas eledment to attach to
	 * @constructor
	 */
	function WebCodecsFrameSink(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');
	}

	WebCodecsFrameSink.prototype = Object.create(FrameSink.prototype);

	/**
	 * Is this frame sink available?
	 * @returns {boolean} true if supported
	 */
	WebCodecsFrameSink.isAvailable = function() {
		return typeof VideoFrame === 'function';
	};

	function formatFourCC(format) {
		if ((format.chromaWidth == format.width / 2) && (format.chromaHeight == format.height / 2)) {
			return "I420";
		}
		if ((format.chromaWidth == format.width / 2) && (format.chromaHeight == format.height)) {
			return "I422";
		}
		if ((format.chromaWidth == format.width) && (format.chromaHeight == format.height)) {
			return "I444";
		}
		throw new RangeError("Unsupported YUV format for WebCodecs drawing backend");
	}

	function colorSpace(format) {
		// @todo get correct values from the input
		return {
			primaries: 'bt709',
			transfer: 'bt709',
			matrix: 'bt709',
			fullRange: false,
		};
	}

	/**
	 * Convert a YUVBuffer into a WebCodecs VideoFrame.
	 *
	 * @param {YUVBuffer} buffer input YUVBuffer to convert
	 * @returns {VideoFrame} caller is responsible for calling close()
	 */
	WebCodecsFrameSink.convertVideoFrame = function (buffer) {
		// WARNING: THIS NEEDS TO CREATE A COPY
		// @todo fixme we can use a common array compatibly
		var offsetY = 0;
		var offsetU = offsetY + buffer.y.bytes.byteLength;
		var offsetV = offsetU + buffer.u.bytes.byteLength;
		var len = offsetV + buffer.v.bytes.byteLength;
		var bytes = new Uint8Array(len);
		bytes.set(buffer.y.bytes, offsetY);
		bytes.set(buffer.u.bytes, offsetU);
		bytes.set(buffer.v.bytes, offsetV);

		var format = buffer.format;
		var options = {
			format: formatFourCC(format),
			codedWidth: format.width,
			codedHeight: format.height,
			timestamp: Math.round((buffer.timestamp || 0) * 1000000),
			layout: [
				{offset: offsetY, stride: buffer.y.stride},
				{offset: offsetU, stride: buffer.u.stride},
				{offset: offsetV, stride: buffer.v.stride},
			],
			visibleRect: {
				x: format.cropLeft,
				y: format.cropTop,
				width: format.cropWidth,
				height: format.cropHeight,
			},
			displayWidth: format.displayWidth,
			displayHeight: format.displayHeight,
			colorSpace: colorSpace(format),
		};
		return new VideoFrame(bytes.buffer, options);
	}

	/**
	 * Actually draw a frame into the canvas.
	 * @param {YUVFrame} buffer - YUV frame buffer object to draw
	 */
	WebCodecsFrameSink.prototype.drawFrame = function (buffer) {
		var owned, frame;
		if (buffer instanceof VideoFrame) {
			frame = buffer;
			owned = false;
		} else {
			frame = WebCodecsFrameSink.convertVideoFrame(buffer);
			owned = true;
		}

		if (this.canvas.width !== frame.displayWidth || this.canvas.height !== frame.displayHeight) {
			// Keep the canvas at the right size...
			this.canvas.width = frame.displayWidth;
			this.canvas.height = frame.displayHeight;
		}

		this.ctx.drawImage(frame, 0, 0);

		if (owned) {
			// Converted frames need to be manually freed, I guess?
			// Really wish this API were clearer about resource management. :D
			frame.close();
		}
	}

	WebCodecsFrameSink.prototype.clear = function() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	};

	module.exports = WebCodecsFrameSink;
})();
