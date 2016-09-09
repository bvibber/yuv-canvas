
(function() {
  "use strict";

  var YUVBuffer = require('yuv-buffer'),
    YUVCanvas = require('yuv-canvas');

  var canvas = document.querySelector('canvas'),
    yuvCanvas = new YUVCanvas(canvas),
    format,
    frame;

  function setupFrame() {
    format = YUVBuffer.format({
      width: 640,
      height: 480
    });
    frame = YUVBuffer.frame(format);
  }

  function updateFrame() {
    var x, y;

    // Draw random 'static' in each luma plane
    for (y = 0; y < format.height; y++) {
      for (x = 0; x < format.width; x++) {
        frame.y.bytes[y * frame.y.stride + x] = Math.random() * 255;
      }
    }
    // Draw random 'static' in each chroma plane
    for (y = 0; y < format.chromaHeight; y++) {
      for (x = 0; x < format.chromaWidth; x++) {
        frame.u.bytes[y * frame.u.stride + x] = Math.random() * 255;
        frame.u.bytes[y * frame.v.stride + x] = Math.random() * 255;
      }
    }

    yuvCanvas.drawFrame(frame);
  }

  setupFrame();
  setInterval(updateFrame, 250);
})();
