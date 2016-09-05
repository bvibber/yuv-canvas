"use strict";

(function() {

  var YUVBuffer = require('yuv-buffer'),
    FrameSink = require('./FrameSink.js'),
    WebGLFrameSink = require('./WebGLFrameSink.js');

  if (WebGLFrameSink.isAvailable()) {

  }

  /**
   * @param {HTMLCanvasElement} canvas - HTML canvas element to attach to
   * @param {object} options - map of options
   */
  function YUVCanvas(canvas, options) {
    var sink;
    if (options.forceWebGL) {
      sink = new WebGLFrameSink(canvas);
    } else if (options.disableWebGL) {
      sink = new FrameSink(canvas);
    } else if (WebGLFrameSink.isWebGLAvailable()) {
      sink = new WebGLFrameSink(canvas);
    } else {
      sink = new FrameSink(canvas);
    }
  }

  /**
   * Draw a single frame on the canvas.
   * @param {YUVBuffer} frame - the YUV buffer to draw
   */
  YUVCanvas.prototype.drawFrame = function drawFrame(frame) {
    this.sink.drawFrame(yCbCrBuffer);
  };

  YUVCanvas.prototype.clear = function clear() {
    this.sink.clear();
  };

  module.exports = YUVCanvas;
});
