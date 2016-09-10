
(function() {
  "use strict";

  var YUVBuffer = require('yuv-buffer'),
    YUVCanvas = require('yuv-canvas');

  var canvas = document.querySelector('canvas'),
    yuvCanvas = new YUVCanvas(canvas),
    format,
    frame,
    sourceData = {};

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
    var canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth,
    canvas.height = image.naturalHeight;

    var context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height)
  }

  // In this example we have separate images with Y, U, and V plane data.
  // Copy the grayscale brightnesses into the given YUVPlane object,
  // applying a multiplier which we can switch around.
  function copyBrightnessToPlane(imageData, plane, width, height, multiplier) {
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        plane.bytes[y * plane.stride + x] = imageData.data[y * width * 4 + x * 4] * multiplier;
      }
    }
  }

  function setupSources() {
    function setup(imageId, index) {
      var image = document.getElementById(imageId);
      function doit() {
        sourceData[index] = extractImageData(image);
        updateFrame();
      }
      if (image.naturalWidth) {
        doit();
      } else {
        image.addEventListener('load', doit);
      }
    }
    setup('yplane', 'y');
    setup('uplane', 'u');
    setup('vplane', 'v');
  }

  function updateFrame() {
    // Copy data in!
    if (sourceData.y) {
      copyBrightnessToPlane(sourceData.y, frame.y, format.width, format.height, 1);
    }
    if (sourceData.u) {
      copyBrightnessToPlane(sourceData.u, frame.u, format.chromaWidth, format.chromaHeight, 1);
    }
    if (sourceData.v) {
      copyBrightnessToPlane(sourceData.v, frame.v, format.chromaWidth, format.chromaHeight, 1);
    }

    yuvCanvas.drawFrame(frame);
  }

  setupFrame();
  setupSources();

})();
