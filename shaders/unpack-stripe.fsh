// extra 'stripe' texture fiddling to work around IE 11's poor performance on gl.LUMINANCE and gl.ALPHA textures

precision mediump float;
uniform sampler2D uStripe;
uniform sampler2D uTexture;
varying vec2 vTexturePosition;
void main() {
   // Y, Cb, and Cr planes are mapped into a pseudo-RGBA texture
   // so we can upload them without expanding the bytes on IE 11
   // which doesn\'t allow LUMINANCE or ALPHA textures.
   // The stripe textures mark which channel to keep for each pixel.
   vec4 vStripe = texture2D(uStripe, vTexturePosition);

   // Each texture extraction will contain the relevant value in one
   // channel only.
   vec4 vTemp = texture2D(uTexture, vTexturePosition) * vStripe;

   // Assemble it back
   float fLuminance = vTemp.x + vTemp.y + vTemp.z + vTemp.w;

   gl_FragColor = vec4(fLuminance, fLuminance, fLuminance, 1);
}
