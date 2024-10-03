# YUVCanvas draws YUV video frames to an HTML 5 canvas element.

It is used in the [ogv.js media player](https://github.com/bvibber/ogv.js)
and is suitable for high-frequency frame updates using WebGL for drawing
and colorspace conversion.

## Copyright

Copyright 2014-2024 by Brooke Vibber <bvibber@pobox.com>
MIT license, see the source files:

* Source: https://github.com/bvibber/yuv-canvas
* Issues: https://github.com/bvibber/yuv-canvas/issues

## Updates

1.3.0 - 2024-10-03

* build cleanup
* doc/name/links cleanup

1.2.11 - 2022-03-04

* perf: further improvements to speed in Safari / macOS using alpha instead of luminance textures
* update shaders from low to medium precision, may fix pixel precision errors on some GPUs

1.2.10 - 2022-03-04

* perf: fixed over-eager use of texImage2d on non-stripe frame updates
* turning off stripe mode as default due to a compatibility problem with Netscape on macOS that is not resolved

1.2.9 - 2022-01-27

* re-enabled "stripe" hack, but now by default everywhere. Turns out it makes a huge difference on macOS with some AMD GPUs too!

1.2.8 - 2022-01-11

* disabled "stripe" texture hack for Windows by default; uses deprecated userAgent, and makes little difference in 2022 vs 2014

1.2.7 - 2021-05-26

* applied contributed patch updating texture state when frame size changes
* added dev dep for running demo on http-server

1.2.6 - 2019-05-27

* added an extra WebGL option to preserve back buffer, fixes canvas video capture in Firefox

1.2.5 - 2019-05-27

* remove some extra WebGL options that just slowed things down and could cause flicker in Safari during canvas video capture

1.2.4 - 2019-02-06

* fix software rendering path for crop offsets (Theora)

1.2.3 - 2019-02-04

* optimize software rendering path by a few percent

1.2.2 - 2019-02-04

* don't use WebGL when software rendering is in use (failIfMajorPerformanceCaveat)
* fix use of preferLowPowerToHighPerformance for preferring integrated GPU

1.2.1 - 2018-01-18

* fix regression breaking iOS 9

1.2.0 - 2017-10-27

* optimized Windows rendering (restored "stripe" more cleanly)
* retooled rendering order to minimize CPU/GPU sync points

1.1.0 - 2017-10-27

* improved scaling/filtering on Windows (dropped "stripe" optimization)

1.0.1 - 2017-02-17

* fix flickering in Safari with software rendering

1.0.0 - 2016-09-11

* Initial break-out release from ogv.js

## Data format

Planar YUV frames are packed into objects per the [yuv-buffer](https://github.com/bvibber/yuv-buffer) format. Frame buffer objects can be safely copied or transferred between worker threads, and can be either garbage collected or reused for another frame after output.

Each frame buffer includes the frame's size, a crop rectangle, a display aspect ratio, and chroma subsampling format as well as the raw bytes.

## WebGL drawing acceleration

Accelerated YCbCr->RGB conversion and drawing is done using WebGL on supporting browsers (Firefox, Chrome, IE 11, Edge, and Safari for iOS 8 & OS X 10.9), and is enabled by default if available.

Caller can pass the 'webGL: false' key to options to force use of the software conversion and 2d canvas, or 'webGL: true' to force a failure if WebGL initialization fails.

### Windows vs luminance textures

The Y, U and V planes are uploaded as luminance textures, then combined into RGB output by a shader.

Early versions of IE 11 do not support luminance or alpha textures at all, and in IE 11 update 1 and Edge uploading is unexpectedly slow. In fact, luminance and alpha textures seem consistently slow on Windows even in Chrome and Firefox, possibly due to a mismatch in interfaces between WebGL and Direct3D.

I've found as of 2022 this also affects some Mac systems with AMD GPUs, so a workaround is now enabled for all systems by default.

The textures are uploaded as packed RGBA textures, then unpacked to luminance textures on the GPU. This has a small runtime cost, but seems less than the cost of letting the ANGLE or other driver layer in the browser swizzle.

## Usage

`yuv-canvas` is intended to be used via [browserify](http://browserify.org/), [webpack](http://webpack.github.io/), or similar npm-friendly bundling tool.

```js
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

## Demo

The [included demo](https://bvibber.github.io/yuv-canvas/demo.html) combines Y, U, and V planes from grayscale JPEGs into a color photograph on a canvas. Check it out!

## Building

Run `npm install` (or `grunt` to rebuild if necessary) to build derived files in a local source checkout.

Derived files are the array of WebGL shaders (`build/shaders.js`) and the bundled JS for the demo (`docs/demo-bundled.js`).

# License

MIT-style license:

Copyright (c) 2014-2024 Brooke Vibber <bvibber@pobox.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
