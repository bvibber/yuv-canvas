(function() {
	var YCbCr = require("./YCbCr.js");

	/**
	 * @param HTMLCanvasElement canvas
	 * @constructor
	 */
	function SoftwareFrameSink(canvas) {
		var self = this,
			ctx = canvas.getContext('2d'),
			imageData = null,
			resampleCanvas = null,
			resampleContext = null;



		function initImageData(width, height) {
			imageData = ctx.createImageData(width, height);

			// Prefill the alpha to opaque
			var data = imageData.data,
				pixelCount = width * height * 4;
			for (var i = 0; i < pixelCount; i += 4) {
				data[i + 3] = 255;
			}
		}

		function initResampleCanvas(cropWidth, cropHeight) {
			resampleCanvas = document.createElement('canvas');
			resampleCanvas.width = cropWidth;
			resampleCanvas.height = cropHeight;
			resampleContext = resampleCanvas.getContext('2d');
		}

		/**
		 * Actually draw a frame into the canvas.
		 */
		self.drawFrame = function drawFrame(buffer) {
			var format = buffer.format;
			if (imageData === null ||
					imageData.width != format.width ||
					imageData.height != format.height) {
				initImageData(format.width, format.height);
			}

			// YUV -> RGB over the entire encoded frame
			YCbCr.convertYCbCr(buffer, imageData.data);

			var resample = (format.cropWidth != format.displayWidth || format.cropHeight != format.displayHeight);
			var drawContext;
			if (resample) {
				// hack for non-square aspect-ratio
				// putImageData doesn't resample, so we have to draw in two steps.
				if (!resampleCanvas) {
					initResampleCanvas(format.cropWidth, format.cropHeight);
				}
				drawContext = resampleContext;
			} else {
				drawContext = ctx;
			}

			// Draw cropped frame to either the final or temporary canvas
			drawContext.putImageData(imageData,
							         0, 0,
											 format.cropLeft, format.cropTop,
											 format.cropWidth, format.cropHeight);

			if (resample) {
				ctx.drawImage(resampleCanvas, 0, 0, format.displayWidth, format.displayHeight);
			}
		};

		self.clear = function() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		};

		return self;
	}

	module.exports = FrameSink;
})();
