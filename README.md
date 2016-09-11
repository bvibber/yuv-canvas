YUVCanvas draws YUV video frames to an HTML 5 canvas element.

It is used in the [ogv.js media player](https://github.com/brion/ogv.js)
and is suitable for high-frequency frame updates using WebGL for drawing
and colorspace conversion.

#Copyright

Copyright 2014-2016 by Brion Vibber <brion@pobox.com>
MIT license, see the source files:

* Source: https://github.com/brion/yuv-canvas
* Issues: https://github.com/brion/yuv-canvas/issues

#Data format

Planar YUV frames are packed into objects per the
[yuv-buffer](https://github.com/brion/yuv-buffer) format. Frame buffer objects
can be safely copied or transferred between worker threads, and can be either
garbage collected or reused for another frame after output.

Each frame buffer includes the frame's size, a crop rectangle, a display
aspect ratio, and chroma subsampling format as well as the raw bytes.

#WebGL drawing acceleration

Accelerated YCbCr->RGB conversion and drawing is done using WebGL on supporting
browsers (Firefox, Chrome, IE 11, Edge, and Safari for iOS 8 & OS X 10.9), and
is enabled by default if available.

Caller can pass the 'disableWebGL: false' key to options to force use of the
software conversion and 2d canvas, or 'forceWebGL: true' to force a failure if
WebGL initialization fails.

##Windows vs luminance textures

On most operating systems, the Y, U and V planes are uploaded as luminance
textures, then combined into RGB output by a shader.

Early versions of IE 11 do not support luminance or alpha textures at all, and
in IE 11 update 1 and Edge uploading is unexpectedly slow. In fact, luminance
and alpha textures seem consistently slow on Windows even in Chrome and Firefox,
possibly due to a mismatch in interfaces between WebGL and Direct3D.

As a workaround, on Windows the data is packed into RGBA textures for faster
texture upload and unpacked in the shader. This performs more consistently, but
disables filtering and may cause visual glitches on files that have a
non-default aspect ratio.

#Usage

`yuv-canvas` is intended to be used via [browserify](http://browserify.org/), [webpack](http://webpack.github.io/), or similar npm-friendly bundling tool.

```
var YUVCanvas = require('yuv-canvas');

// Get your canvas
var canvas = document.querySelector('canvas#myvid');

// Attach it to a YUVCanvas.FrameSink instance!
//
// This will take over the canvas drawing context, which may include switching
// it into WebGL mode or resizing it to fit the output frames. From now on you
// can manipulate the canvas element itself such as attaching it in the DOM or
// changing its CSS styles, but should not attempt to touch its size or drawing
// context directly.
var yuv = YUVCanvas.attach(canvas);

// Now... given a YUV frame buffer object, draw it!
var buffer = decodeVideoFrame();
yuv.drawFrame(buffer);

// Or clear the canvas.
yuv.clear();
```

#Demo

The [included demo](https://brion.github.io/yuv-canvas/demo.html)
combines Y, U, and V planes from grayscale JPEGs into a color photograph
on a canvas. Check it out!


#Building

Run `npm install` (or `grunt` to rebuild if necessary) to build derived files in
a local source checkout.

Derived files are the array of WebGL shaders (`build/shaders.js`) and the bundled
JS for the demo (`docs/demo-bundled.js`).
