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

	var FrameSink = require('./FrameSink.js'),
		shaders = require('../build/shaders.js');

	/**
	 * Warning: canvas must not have been used for 2d drawing prior!
	 *
	 * @param {HTMLCanvasElement} canvas - HTML canvas element to attach to
	 * @constructor
	 */
	function WebGLFrameSink(canvas) {
		var self = this,
			gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl'),
			debug = false; // swap this to enable more error checks, which can slow down rendering

		if (gl === null) {
			throw new Error('WebGL unavailable');
		}

		// GL!
		function checkError() {
			if (debug) {
				err = gl.getError();
				if (err !== 0) {
					throw new Error("GL error " + err);
				}
			}
		}

		function compileShader(type, source) {
			var shader = gl.createShader(type);
			gl.shaderSource(shader, source);
			gl.compileShader(shader);

			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				var err = gl.getShaderInfoLog(shader);
				gl.deleteShader(shader);
				throw new Error('GL shader compilation for ' + type + ' failed: ' + err);
			}

			return shader;
		}


		var program,
			unpackProgram,
			err;

		// In the world of GL there are no rectangles.
		// There are only triangles.
		// THERE IS NO SPOON.
		var rectangle = new Float32Array([
			// First triangle (top left, clockwise)
			-1.0, -1.0,
			+1.0, -1.0,
			-1.0, +1.0,

			// Second triangle (bottom right, clockwise)
			-1.0, +1.0,
			+1.0, -1.0,
			+1.0, +1.0
		]);

		var textures = {};
		var framebuffers = {};

		function createOrReuseTexture(name) {
			if (!textures[name]) {
				textures[name] = gl.createTexture();
			}
			return textures[name];
		}

		function uploadTexture(name, width, height, data) {
			var texture = createOrReuseTexture(name);
			if (WebGLFrameSink.stripe) {
				// Upload to a temporary RGBA texture, then unpack it.
				// This is faster than CPU-side swizzling in ANGLE on Windows.
				gl.useProgram(unpackProgram);
				var fb = fb = framebuffers[name];

				if (!fb) {
					// Create a framebuffer and an empty target size
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, texture);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
					gl.texImage2D(
						gl.TEXTURE_2D,
						0, // mip level
						gl.RGBA, // internal format
						width,
						height,
						0, // border
						gl.RGBA, // format
						gl.UNSIGNED_BYTE, //type
						null // data!
					);

					fb = framebuffers[name] = gl.createFramebuffer();
				}
				gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

				var tempTexture = createOrReuseTexture(name + '_temp');
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, tempTexture);
				gl.uniform1i(gl.getUniformLocation(unpackProgram, 'uTexture'), 1);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texImage2D(
					gl.TEXTURE_2D,
					0, // mip level
					gl.RGBA, // internal format
					width / 4,
					height,
					0, // border
					gl.RGBA, // format
					gl.UNSIGNED_BYTE, //type
					data // data!
				);

				var stripeTexture = createOrReuseTexture(name + '_stripe');
				gl.activeTexture(gl.TEXTURE2);
				gl.bindTexture(gl.TEXTURE_2D, stripeTexture);
				gl.uniform1i(gl.getUniformLocation(unpackProgram, 'uStripe'), 2);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texImage2D(
					gl.TEXTURE_2D,
					0, // mip level
					gl.RGBA, // internal format
					width,
					1,
					0, // border
					gl.RGBA, // format
					gl.UNSIGNED_BYTE, //type
					buildStripe(width, 1) // data!
				);

				var buf = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, buf);
				gl.bufferData(gl.ARRAY_BUFFER, rectangle, gl.STATIC_DRAW);

				var positionLocation = gl.getAttribLocation(unpackProgram, 'aPosition');
				gl.enableVertexAttribArray(positionLocation);
				gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

				// Set up the texture geometry...
				var textureRectangle = new Float32Array([
					0, 0,
					1, 0,
					0, 1,
					0, 1,
					1, 0,
					1, 1
				]);

				var texturePositionBuffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, texturePositionBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, textureRectangle, gl.STATIC_DRAW);

				var texturePositionLocation = gl.getAttribLocation(unpackProgram, 'aTexturePosition');
				gl.enableVertexAttribArray(texturePositionLocation);
				gl.vertexAttribPointer(texturePositionLocation, 2, gl.FLOAT, false, 0, 0);

				// Draw into the target texture...
				gl.viewport(0, 0, width, height);

				gl.drawArrays(gl.TRIANGLES, 0, rectangle.length / 2);

				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
			} else {
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, texture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.texImage2D(
					gl.TEXTURE_2D,
					0, // mip level
					gl.LUMINANCE, // internal format
					width,
					height,
					0, // border
					gl.LUMINANCE, // format
					gl.UNSIGNED_BYTE, //type
					data // data!
				);
			}
		}

		function attachTexture(name, register, index) {
			gl.activeTexture(register);
			gl.bindTexture(gl.TEXTURE_2D, textures[name]);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

			gl.uniform1i(gl.getUniformLocation(program, name), index);
		}

		function buildStripe(width, height) {
			var len = width * height,
				out = new Uint32Array(len);
			for (var i = 0; i < len; i += 4) {
				out[i    ] = 0x000000ff;
				out[i + 1] = 0x0000ff00;
				out[i + 2] = 0x00ff0000;
				out[i + 3] = 0xff000000;
			}
			return new Uint8Array(out.buffer);
		}

		function initProgram(vertexShaderSource, fragmentShaderSource) {
			var vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
			var fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

			var program = gl.createProgram();
			gl.attachShader(program, vertexShader);
			gl.attachShader(program, fragmentShader);

			gl.linkProgram(program);
			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				var err = gl.getProgramInfoLog(program);
				gl.deleteProgram(program);
				throw new Error('GL program linking failed: ' + err);
			}

			return program;
		}

		function init() {
			if (WebGLFrameSink.stripe) {
				unpackProgram = initProgram(shaders.vertexStripe, shaders.fragmentStripe);
			}
			program = initProgram(shaders.vertex, shaders.fragment);
		}

		/**
		 * Actually draw a frame.
		 * @param {YUVFrame} buffer - YUV frame buffer object
		 */
		self.drawFrame = function(buffer) {
			var format = buffer.format;

			if (canvas.width !== format.displayWidth || canvas.height !== format.displayHeight) {
				// Keep the canvas at the right size...
				canvas.width = format.displayWidth;
				canvas.height = format.displayHeight;
				self.clear();
			}

			if (!program) {
				init();
			}

			// Create the textures...
			// If using stripe mode this may switch program during upload!
			uploadTexture('uTextureY', buffer.y.stride, format.height, buffer.y.bytes);
			uploadTexture('uTextureCb', buffer.u.stride, format.chromaHeight, buffer.u.bytes);
			uploadTexture('uTextureCr', buffer.v.stride, format.chromaHeight, buffer.v.bytes);

			// Set up the rectangle and draw it
			gl.useProgram(program);
			gl.viewport(0, 0, canvas.width, canvas.height);

			attachTexture('uTextureY', gl.TEXTURE0, 0);
			attachTexture('uTextureCb', gl.TEXTURE1, 1);
			attachTexture('uTextureCr', gl.TEXTURE2, 2);

			// Set up geometry
			var buf = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, buf);
			gl.bufferData(gl.ARRAY_BUFFER, rectangle, gl.STATIC_DRAW);

			var positionLocation = gl.getAttribLocation(program, 'aPosition');
			gl.enableVertexAttribArray(positionLocation);
			gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);


			// Set up the texture geometry...
			function setupTexturePosition(varname, texWidth) {
				// Warning: assumes that the stride for Cb and Cr is the same size in output pixels
				var textureX0 = format.cropLeft / texWidth;
				var textureX1 = (format.cropLeft + format.cropWidth) / texWidth;
				var textureY0 = (format.cropTop + format.cropHeight) / format.height;
				var textureY1 = format.cropTop / format.height;
				var textureRectangle = new Float32Array([
					textureX0, textureY0,
					textureX1, textureY0,
					textureX0, textureY1,
					textureX0, textureY1,
					textureX1, textureY0,
					textureX1, textureY1
				]);

				var texturePositionBuffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, texturePositionBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, textureRectangle, gl.STATIC_DRAW);

				var texturePositionLocation = gl.getAttribLocation(program, varname);
				gl.enableVertexAttribArray(texturePositionLocation);
				gl.vertexAttribPointer(texturePositionLocation, 2, gl.FLOAT, false, 0, 0);
			}
			setupTexturePosition('aLumaPosition', buffer.y.stride);
			setupTexturePosition('aChromaPosition', buffer.u.stride * format.width / format.chromaWidth);

			// Aaaaand draw stuff.
			gl.drawArrays(gl.TRIANGLES, 0, rectangle.length / 2);
			
			gl.getError();
		};

		self.clear = function() {
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.clearColor(0.0, 0.0, 0.0, 0.0);
			gl.clear(gl.COLOR_BUFFER_BIT);
		};

		self.clear();

		return self;
	}

	/**
	 * Static function to check if WebGL will be available with appropriate features.
	 *
	 * @returns {boolean} - true if available
	 */
	WebGLFrameSink.isAvailable = function() {
		var canvas = document.createElement('canvas'),
			gl;
		canvas.width = 1;
		canvas.height = 1;
		var options = {
			// Still dithering on whether to use this.
			// Recommend avoiding it, as it's overly conservative
			//failIfMajorPerformanceCaveat: true
		};
		try {
			gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
		} catch (e) {
			return false;
		}
		if (gl) {
			var register = gl.TEXTURE0,
				width = 4,
				height = 4,
				texture = gl.createTexture(),
				data = new Uint8Array(width * height),
				texWidth = width,
				format = gl.LUMINANCE,
				filter = gl.LINEAR;

			gl.activeTexture(register);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0, // mip level
				format, // internal format
				texWidth,
				height,
				0, // border
				format, // format
				gl.UNSIGNED_BYTE, //type
				data // data!
			);

			var err = gl.getError();
			if (err) {
				// Doesn't support luminance textures?
				return false;
			} else {
				return true;
			}
		} else {
			return false;
		}
	};

	WebGLFrameSink.prototype = Object.create(FrameSink.prototype);

	module.exports = WebGLFrameSink;
})();
