import type {YUVFrame} from "yuv-buffer";

export declare class FrameSink {
  /**
   * Create a YUVCanvas and attach it to an HTML5 canvas element.
   *
   * This will take over the drawing context of the canvas and may turn
   * it into a WebGL 3d canvas if possible. Do not attempt to use the
   * drawing context directly after this.
   *
   * @param {HTMLCanvasElement} canvas - HTML canvas element to attach to
   * @param {YUVCanvasOptions} options - map of options
   * @throws exception if WebGL requested but unavailable
   * @constructor
   * @abstract
   */
  constructor(canvas: HTMLCanvasElement, options: any);

  /**
   * Draw a single YUV frame on the underlying canvas, converting to RGB.
   * If necessary the canvas will be resized to the optimal pixel size
   * for the given buffer's format.
   *
   * @param {YUVFrame} buffer - the YUV buffer to draw
   * @see {@link https://www.npmjs.com/package/yuv-buffer|yuv-buffer} for format
   */
  drawFrame(buffer: YUVFrame): void;

  /**
   * Clear the canvas using appropriate underlying 2d or 3d context.
   */
  clear(): void;
}

export declare class SoftwareFrameSink {
  /**
   * @param {HTMLCanvasElement} canvas - HTML canvas eledment to attach to
   * @constructor
   */
  constructor(canvas: HTMLCanvasElement);

  /**
   * Actually draw a frame into the canvas.
   * @param {YUVFrame} buffer - YUV frame buffer object to draw
   */
  drawFrame: (buffer: YUVFrame) => void;
  clear: () => void;
}

export declare class WebGLFrameSink {
  /**
   * Warning: canvas must not have been used for 2d drawing prior!
   *
   * @param {HTMLCanvasElement} canvas - HTML canvas element to attach to
   * @constructor
   */
  constructor(canvas: HTMLCanvasElement);

  /**
   * Actually draw a frame.
   * @param {YUVFrame} buffer - YUV frame buffer object
   */
  drawFrame: (buffer: YUVFrame) => void;
  clear: () => void;
}
export declare namespace WebGLFrameSink {
  const stripe: boolean;

  function contextForCanvas(canvas: HTMLCanvasElement): WebGLRenderingContext;

  /**
   * Static function to check if WebGL will be available with appropriate features.
   *
   * @returns {boolean} - true if available
   */
  function isAvailable(): boolean;
}

export function attach(canvas: HTMLCanvasElement, options: {
  /**
   * - Whether to use WebGL to draw to the canvas and accelerate color space conversion. If left out, defaults to auto-detect.
   */
  webGL: boolean;
}): FrameSink;
