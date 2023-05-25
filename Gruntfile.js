
module.exports = function(grunt) {

	function stringify(filename) {
		return JSON.stringify(require('fs').readFileSync(filename, 'utf8'));
	}

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		eslint: {
			options: {
			},
			target: 'src/*.js'
		},
		replace: {
			shaders: {
				src: ['src/shaders.js.in'],
				dest: ['build/shaders.js'],
				replacements: [{
					from: 'YCBCR_VERTEX_SHADER',
					to: stringify('./shaders/YCbCr.vsh')
				}, {
					from: 'YCBCR_FRAGMENT_SHADER',
					to: stringify('./shaders/YCbCr.fsh')
				}, {
					from: 'RGB_VERTEX_SHADER',
					to: stringify('./shaders/RGB.vsh')
				}, {
					from: 'RGB_FRAGMENT_SHADER',
					to: stringify('./shaders/RGB.fsh')
				}]
			}
		}
	});

	grunt.loadNpmTasks('grunt-eslint');
	grunt.loadNpmTasks('grunt-text-replace');

	grunt.registerTask('default', ['eslint', 'replace']);

};
