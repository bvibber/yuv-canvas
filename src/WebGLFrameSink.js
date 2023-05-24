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
import {shaders} from '../build/shaders.js';

// In the world of GL there are no rectangles.
// There are only triangles.
// THERE IS NO SPOON.
const rectangle = new Float32Array([
	// First triangle (top left, clockwise)
	-1.0, -1.0,
	+1.0, -1.0,
	-1.0, +1.0,

	// Second triangle (bottom right, clockwise)
	-1.0, +1.0,
	+1.0, -1.0,
	+1.0, +1.0
]);
// and in 0..1 space
const textureRectangle = new Float32Array([
	0, 0,
	1, 0,
	0, 1,
	0, 1,
	1, 0,
	1, 1
]);

function compileShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const err = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error('GL shader compilation for ' + type + ' failed: ' + err);
	}

	return shader;
}

function mapProps(names, callback) {
	let obj = Object.create(null);
	for (let name of names) {
		obj[name] = callback(name);
	}
	return obj;
}

class Program {
	constructor(gl, {vertexShader, fragmentShader, uniforms=[], attribs=[], buffers=[]}) {
		this.vertexShader = compileShader(gl.VERTEX_SHADER, vertexShader);
		this.fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShader);

		this.program = gl.createProgram();
		gl.attachShader(this.program, vertexShader);
		gl.attachShader(this.program, fragmentShader);
		gl.linkProgram(this.program);
		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			const err = gl.getProgramInfoLog(this.program);
			gl.deleteProgram(this.program);
			throw new Error('GL program linking failed: ' + err);
		}

		this.uniforms = mapProps(uniforms, (name) => gl.getUniformLocation(this.program, name));
		this.attribs = mapProps(attribs, (name) => gl.getAttribLocation(this.program, name));
		this.buffers = mapProps(buffers, (_name) => gl.createBuffer() );
	}
}

class TextureCache {
	constructor(gl) {
		this.gl = gl;
		this.clear();
	}

	clear() {
		this.textures = new Map();
	}

	get(name) {
		return this.textures.get(name);
	}

	createOrReuse(name, force=false) {
		let texture = this.get(name);
		let created = false;
		if (!texture || force) {
			texture = this.gl.createTexture();
			this.textures.set(name, texture);
			created = true;
		}
		return {texture, created};
	}
}

export class WebGLFrameSink extends FrameSink {

	/**
	 * Warning: canvas must not have been used for 2d drawing prior!
	 *
	 * @param {HTMLCanvasElement} canvas - HTML canvas element to attach to
	 * @param {Object?} options - optional options
	 */
	constructor(canvas, options={}) {
		super(canvas);
		this.gl = WebGLFrameSink.contextForCanvas(this.canvas);
		if (this.gl === null) {
			throw new Error('WebGL unavailable');
		}
		
		this.debug = false; // swap this to enable more error checks, which can slow down rendering
		this.clear();
	}

	checkError() {
		if (this.debug) {
			const err = this.gl.getError();
			if (err !== 0) {
				throw new Error("GL error " + err);
			}
		}
	}

	uploadTexture(name, formatUpdate, width, height, data) {
		let {texture, created} = this.cache.createOrReuse(name, formatUpdate);
		this.gl.activeTexture(this.gl.TEXTURE0);

		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		if (created) {
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
			this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
			this.gl.texImage2D(
				this.gl.TEXTURE_2D,
				0, // mip level
				this.gl.ALPHA, // internal format
				width,
				height,
				0, // border
				this.gl.ALPHA, // format
				this.gl.UNSIGNED_BYTE, //type
				data // data!
			);
		} else {
			this.gl.texSubImage2D(
				this.gl.TEXTURE_2D,
				0, // mip level
				0, // x
				0, // y
				width,
				height,
				this.gl.ALPHA, // internal format
				this.gl.UNSIGNED_BYTE, //type
				data // data!
			);
		}
	}

	attachTexture(name, register, index) {
		this.gl.activeTexture(register);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.cache.get(name));
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

		this.gl.uniform1i(this.program.uniforms[name], index);
	}

	init() {
		this.cache = new TextureCache(this.gl);

		this.program = new Program(this.gl, {
			vertexShader: shaders.vertex,
			fragmentShader: shaders.fragment,
			attribs: ['aPosition', 'aLumaPosition', 'aChromaPosition'],
			buffers: ['position', 'lumaPosition', 'chromaPosition'],
		});
	}

	setupRect(buffer, location, rectangle) {
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
		this.gl.enableVertexAttribArray(location);
		this.gl.vertexAttribPointer(location, 2, this.gl.FLOAT, false, 0, 0);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, rectangle, this.gl.STATIC_DRAW);
	}

	setupTexturePosition(buffer, location, format, texWidth) {
		// Warning: assumes that the stride for Cb and Cr is the same size in output pixels
		const textureX0 = format.cropLeft / texWidth;
		const textureX1 = (format.cropLeft + format.cropWidth) / texWidth;
		const textureY0 = (format.cropTop + format.cropHeight) / format.height;
		const textureY1 = format.cropTop / format.height;
		const textureRectangle = new Float32Array([
			textureX0, textureY0,
			textureX1, textureY0,
			textureX0, textureY1,
			textureX0, textureY1,
			textureX1, textureY0,
			textureX1, textureY1
		]);
		this.setupRect(buffer, location, textureRectangle);
	}

	/**
	 * Actually draw a frame.
	 * @param {YUVFrame} buffer - YUV frame buffer object
	 */
	drawFrame(buffer) {
		const format = buffer.format;
		const formatUpdate = (!this.program ||
			this.canvas.width !== format.displayWidth ||
			this.canvas.height !== format.displayHeight);

		if (formatUpdate) {
			// Keep the canvas at the right size...
			this.canvas.width = format.displayWidth;
			this.canvas.height = format.displayHeight;
			this.clear();
		}

		if (!this.program) {
			this.init();
		}

		// Set up the rectangle and draw it
		this.gl.useProgram(this.program.program);
		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

		// Create or update the textures...
		this.uploadTexture('uTextureY', formatUpdate, buffer.y.stride, format.height, buffer.y.bytes);
		this.uploadTexture('uTextureCb', formatUpdate, buffer.u.stride, format.chromaHeight, buffer.u.bytes);
		this.uploadTexture('uTextureCr', formatUpdate, buffer.v.stride, format.chromaHeight, buffer.v.bytes);

		if (formatUpdate) {
			this.attachTexture('uTextureY', this.gl.TEXTURE0, 0);
			this.attachTexture('uTextureCb', this.gl.TEXTURE1, 1);
			this.attachTexture('uTextureCr', this.gl.TEXTURE2, 2);

			this.setupRect(
				this.program.buffers.position,
				this.program.attribs.aPosition,
				rectangle
			);
			this.setupTexturePosition(
				this.program.buffers.lumaPosition,
				this.program.attribs.aLumaPosition,
				format,
				buffer.y.stride
			);
			this.setupTexturePosition(
				this.program.buffers.chromaPosition,
				this.program.attribs.aChromaPosition,
				format,
				buffer.u.stride * format.width / format.chromaWidth
			);
		}

		// Aaaaand draw stuff.
		this.gl.drawArrays(this.gl.TRIANGLES, 0, rectangle.length / 2);
	}

	clear() {
		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
	}

	static contextForCanvas(canvas) {
		const options = {
			// Don't trigger discrete GPU in multi-GPU systems
			preferLowPowerToHighPerformance: true,
			powerPreference: 'low-power',
			// Don't try to use software GL rendering!
			failIfMajorPerformanceCaveat: true,
			// In case we need to capture the resulting output.
			preserveDrawingBuffer: true
		};
		return canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
	}

	/**
	 * Static function to check if WebGL will be available with appropriate features.
	 *
	 * @returns {boolean} - true if available
	 */
	static isAvailable() {
		const width = 4,
			height = 4,
			canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		const gl = WebGLFrameSink.contextForCanvas(canvas);
		if (!gl) {
			return false;
		}

		const register = gl.TEXTURE0,
			texture = gl.createTexture(),
			data = new Uint8Array(width * height);

		gl.activeTexture(register);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0, // mip level
			gl.ALPHA, // internal format
			width,
			height,
			0, // border
			gl.ALPHA, // format
			gl.UNSIGNED_BYTE, //type
			data // data!
		);

		const err = gl.getError();
		if (err) {
			// Doesn't support alpha textures!
			return false;
		}

		return true;
	}

}
