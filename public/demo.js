import YUVBuffer from 'yuv-buffer';
import {YUVCanvas} from '../src/yuv-canvas.js';

let options = {};

function q(name) {
	return document.querySelector(name);
}

let filter = identity;

if (location.hash === '#webgl') {
	q('#webgl').checked = true;
	options.webGL = true;
	filter = identity;
} else if (location.hash === '#software') {
	q('#software').checked = true;
	options.webGL = false;
	filter = identity;
} else if (location.hash === '#webgl-webcodecs') {
	q('#webgl-webcodecs').checked = true;
	options.webGL = true;
	filter = convertVideoFrame;
} else if (location.hash === '#software-webcodecs') {
	q('#software-webcodecs').checked = true;
	options.webGL = false;
	filter = convertVideoFrame;
}

q('#webgl').addEventListener('click', () => {
	location.href = location.pathname + '#webgl';
	location.reload();
});
q('#software').addEventListener('click', () => {
	location.href = location.pathname + '#software';
	location.reload();
});
q('#webgl-webcodecs').addEventListener('click', () => {
	location.href = location.pathname + '#webgl-webcodecs';
	location.reload();
});
q('#software-webcodecs').addEventListener('click', () => {
	location.href = location.pathname + '#software-webcodecs';
	location.reload();
});


let canvas = q('canvas'),
	yuvCanvas = YUVCanvas.attach(canvas, options),
	format,
	frame,
	drawable,
	sourceData = {},
	sourceFader = {
		y: 1,
		u: 1,
		v: 1
	};

function setupFrame() {
	format = YUVBuffer.format({
		width: 640,
		height: 480,
		chromaWidth: 320,
		chromaHeight: 240
	});
	frame = YUVBuffer.frame(format);
}

// Rasterize a loaded image and get at its RGBA bytes.
// We'll use this in sample to get brightnesses from grayscale images.
function extractImageData(image) {
	const canvas = document.createElement('canvas');
	canvas.width = image.naturalWidth,
	canvas.height = image.naturalHeight;

	const context = canvas.getContext('2d');
	context.drawImage(image, 0, 0);
	return context.getImageData(0, 0, canvas.width, canvas.height)
}

// In this example we have separate images with Y, U, and V plane data.
// For each plane, we copy the grayscale values into the target YUVPlane
// object's data, applying a per-plane multiplier which is manipulable
// by the user.
function copyBrightnessToPlane(imageData, plane, width, height, multiplier) {
	// Because we're doing multiplication that may wrap, use the browser-optimized
	// Uint8ClampedArray instead of the default Uint8Array view.
	const clampedBytes = new Uint8ClampedArray(plane.bytes.buffer, plane.bytes.offset, plane.bytes.byteLength);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			clampedBytes[y * plane.stride + x] = imageData.data[y * width * 4 + x * 4] * multiplier;
		}
	}
}

function setupSources() {
	function setup(index) {
		const image = document.getElementById(index + 'plane'),
			fader = document.getElementById(index + 'fader');

		function doit() {
			sourceData[index] = extractImageData(image);
			updateFrame();
		}
		if (image.naturalWidth) {
			doit();
		} else {
			image.addEventListener('load', doit);
		}

		fader.addEventListener('input', function() {
			sourceFader[index] = fader.value;
			updateFrame();
		})
	}
	setup('y');
	setup('u');
	setup('v');
}

function updateFrame() {
	// Copy data in!
	if (sourceData.y) {
		copyBrightnessToPlane(sourceData.y, frame.y, format.width, format.height, sourceFader.y);
	}
	if (sourceData.u) {
		copyBrightnessToPlane(sourceData.u, frame.u, format.chromaWidth, format.chromaHeight, sourceFader.u);
	}
	if (sourceData.v) {
		copyBrightnessToPlane(sourceData.v, frame.v, format.chromaWidth, format.chromaHeight, sourceFader.v);
	}

	drawable = filter(frame);
	yuvCanvas.drawFrame(drawable);
}

function setupBenchmark() {
	document.getElementById('benchmark').addEventListener('click', () => {
		const rounds = 1000,
			start = Date.now();
		for (let i = 0; i < rounds; i++) {
			yuvCanvas.drawFrame(drawable);
		}
		const delta = (Date.now() - start) / 1000;
		const fps = rounds / delta;
		document.getElementById('fps').innerText = fps + 'fps';
	});
}

function convertVideoFrame(buffer) {
	if (drawable) {
		drawable.close();
	}
	const format = buffer.format;
	if (format.chromaWidth !== format.width / 2 ||
		format.chromaHeight !== format.height / 2) {
		throw new Error('Needs 4:2:0 buffer');
	}
	const options = {
		format: 'I420',
		codedWidth: format.width,
		codedHeight: format.height,
		timestamp: 0,
		visibleRect: {
			x: format.cropLeft,
			y: format.cropTop,
			width: format.cropWidth,
			height: format.cropHeight,
		},
		displayWidth: format.displayWidth,
		displayHeight: format.displayHeight,
		colorSpace: {
			primaries: 'bt709',
			transfer: 'bt709',
			matrix: 'bt709',
			fullRange: true,
		}
	};

	// Create a packed buffer
	var offsetY = 0;
	var offsetU = offsetY + buffer.y.bytes.byteLength;
	var offsetV = offsetU + buffer.u.bytes.byteLength;
	var len = offsetV + buffer.v.bytes.byteLength;
	var bytes = new Uint8Array(len);

	options.layout = [
		{offset: offsetY, stride: buffer.y.stride},
		{offset: offsetU, stride: buffer.u.stride},
		{offset: offsetV, stride: buffer.v.stride},
	];

	bytes.set(buffer.y.bytes, offsetY);
	bytes.set(buffer.u.bytes, offsetU);
	bytes.set(buffer.v.bytes, offsetV);

	return new VideoFrame(bytes.buffer, options);
}

function identity(buffer) {
	return buffer;
}

setupFrame();
setupSources();
setupBenchmark();
