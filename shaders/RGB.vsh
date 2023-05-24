precision mediump float;

attribute vec2 aPosition;
attribute vec2 aTexturePosition;
void main() {
    gl_Position = vec4(aPosition, 0, 1);
    vTexturePosition = aTexturePosition;
}
