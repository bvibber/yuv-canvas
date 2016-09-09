
module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    eslint: {
      options: {
      },
      target: 'src/*.js'
    },
    browserify: {
      dist: {
        files: {
          'build/yuv-canvas.js': ['src/index.js']
        },
        options: {
          transform: [require('brfs')]
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('default', ['eslint', 'browserify']);

};
