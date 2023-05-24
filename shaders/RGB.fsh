precision mediump float;

uniform sampler2D uTextureImage;
varying vec2 vTexturePosition;
void main() {
   gl_FragColor = texture2D(uTextureImage, vTexturePosition);
}
