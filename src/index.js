"use strict";

(function() {

  var YUVBuffer = require('yuv-buffer'),
    SoftwareFrameSink = require('./SoftwareFrameSink.js'),
    WebGLFrameSink = require('./WebGLFrameSink.js');

  if (WebGLFrameSink.isAvailable()) {

  }

  /**
   * @typedef {Object} YUVCanvasOptions
   * @property {string} webGL - one of "required", "disabled", or "auto". default "auto"
   */

  /**
   * Create a YUVCanvas wrapper attached to an HTML5 canvas element.
   * This will take over the drawing context of the canvas and may turn
   * it into a WebGL 3d canvas if possible. Do not attempt to use the
   * drawing context directly after this.
   *
   * If the webGL option is specified as 'required' but WebGL is not
   * available, will throw an exception.
   *
   * @param {HTMLCanvasElement} canvas - HTML canvas element to attach to
   * @param {YUVCanvasOptions} options - map of options
   */
  function YUVCanvas(canvas, options) {
    var webGL = options.webGL || 'auto';
    if (webGL === 'disabled') {
      this._sink = new SoftwareFrameSink(canvas);
    } else if (webGL === 'required') {
      this._sink = new WebGLFrameSink(canvas);
    } else if (WebGLFrameSink.isWebGLAvailable()) {
      this._sink = new WebGLFrameSink(canvas);
    } else {
      this._sink = new SoftwareFrameSink(canvas);
    }
  }

  /**
   * Draw a single frame on the canvas.
   * @param {YUVBuffer} buffer - the YUV buffer to draw
   */
  YUVCanvas.prototype.drawFrame = function drawFrame(buffer) {
    this._sink.drawFrame(buffer);
  };

  YUVCanvas.prototype.clear = function clear() {
    this._sink.clear();
  };

  module.exports = YUVCanvas;
});
