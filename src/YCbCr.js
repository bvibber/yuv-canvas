/*
Copyright (c) 2014-2016 Brion Vibber <brion@pobox.com>

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

	var depower = require('./depower.js');

	/**
	 * Basic YCbCr->RGB conversion
	 *
	 * @author Brion Vibber <brion@pobox.com>
	 * @copyright 2014-2016
	 * @license MIT-style
	 *
	 * @param {YUVFrame} buffer - input frame buffer
	 * @param {Uint8ClampedArray} output - array to draw RGBA into
	 * Assumes that the output array already has alpha channel set to opaque.
	 */
	function convertYCbCr(buffer, output) {
		var width = buffer.format.width,
			height = buffer.format.height,
			hdec = depower(buffer.format.width / buffer.format.chromaWidth),
			vdec = depower(buffer.format.height / buffer.format.chromaHeight),
			bytesY = buffer.y.bytes,
			bytesCb = buffer.u.bytes,
			bytesCr = buffer.v.bytes,
			strideY = buffer.y.stride,
			strideCb = buffer.u.stride,
			strideCr = buffer.v.stride,
			outStride = 4 * width,
			YPtr = 0, Y0Ptr = 0, Y1Ptr = 0,
			CbPtr = 0, CrPtr = 0,
			outPtr = 0, outPtr0 = 0, outPtr1 = 0,
			colorCb = 0, colorCr = 0,
			multY = 0, multCrR = 0, multCbCrG = 0, multCbB = 0,
			x = 0, y = 0, xdec = 0, ydec = 0;

		if (hdec == 1 && vdec == 1) {
			// Optimize for 4:2:0, which is most common
			outPtr0 = 0;
			outPtr1 = outStride;
			ydec = 0;
			for (y = 0; y < height; y += 2) {
				Y0Ptr = y * strideY;
				Y1Ptr = Y0Ptr + strideY;
				CbPtr = ydec * strideCb;
				CrPtr = ydec * strideCr;
				for (x = 0; x < width; x += 2) {
					colorCb = bytesCb[CbPtr++];
					colorCr = bytesCr[CrPtr++];

					// Quickie YUV conversion
					// https://en.wikipedia.org/wiki/YCbCr#ITU-R_BT.2020_conversion
					// multiplied by 256 for integer-friendliness
					multCrR   = (409 * colorCr) - 57088;
					multCbCrG = (100 * colorCb) + (208 * colorCr) - 34816;
					multCbB   = (516 * colorCb) - 70912;

					multY = (298 * bytesY[Y0Ptr++]);
					output[outPtr0++] = (multY + multCrR) >> 8;
					output[outPtr0++] = (multY - multCbCrG) >> 8;
					output[outPtr0++] = (multY + multCbB) >> 8;
					outPtr0++;

					multY = (298 * bytesY[Y0Ptr++]);
					output[outPtr0++] = (multY + multCrR) >> 8;
					output[outPtr0++] = (multY - multCbCrG) >> 8;
					output[outPtr0++] = (multY + multCbB) >> 8;
					outPtr0++;

					multY = (298 * bytesY[Y1Ptr++]);
					output[outPtr1++] = (multY + multCrR) >> 8;
					output[outPtr1++] = (multY - multCbCrG) >> 8;
					output[outPtr1++] = (multY + multCbB) >> 8;
					outPtr1++;

					multY = (298 * bytesY[Y1Ptr++]);
					output[outPtr1++] = (multY + multCrR) >> 8;
					output[outPtr1++] = (multY - multCbCrG) >> 8;
					output[outPtr1++] = (multY + multCbB) >> 8;
					outPtr1++;
				}
				outPtr0 += outStride;
				outPtr1 += outStride;
				ydec++;
			}
		} else {
			outPtr = 0;
			for (y = 0; y < height; y++) {
				xdec = 0;
				ydec = y >> vdec;
				YPtr = y * strideY;
				CbPtr = ydec * strideCb;
				CrPtr = ydec * strideCr;

				for (x = 0; x < width; x++) {
					xdec = x >> hdec;
					colorCb = bytesCb[CbPtr + xdec];
					colorCr = bytesCr[CrPtr + xdec];

					// Quickie YUV conversion
					// https://en.wikipedia.org/wiki/YCbCr#ITU-R_BT.2020_conversion
					// multiplied by 256 for integer-friendliness
					multCrR   = (409 * colorCr) - 57088;
					multCbCrG = (100 * colorCb) + (208 * colorCr) - 34816;
					multCbB   = (516 * colorCb) - 70912;

					multY = 298 * bytesY[YPtr++];
					output[outPtr++] = (multY + multCrR) >> 8;
					output[outPtr++] = (multY - multCbCrG) >> 8;
					output[outPtr++] = (multY + multCbB) >> 8;
					outPtr++;
				}
			}
		}
	}

	module.exports = {
		convertYCbCr: convertYCbCr
	};
})();
