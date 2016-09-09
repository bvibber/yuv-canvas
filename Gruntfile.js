
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
          from: 'YCBCR_STRIPE_FRAGMENT_SHADER',
          to: stringify('./shaders/YCbCr-stripe.fsh')
        }]
      }
    },
    browserify: {
      /*
      dist: {
        files: {
          'build/yuv-canvas.js': ['src/yuv-canvas.js'],
        },
        options: {
          transform: [require('brfs')],
          standalone: 'YUVCanvas'
        }
      },
      */
      demo: {
        files: {
          'build/demo.js': ['src/demo.js']
        },
        options: {
          transform: [[require('aliasify'), {
            aliases: {
              'yuv-canvas': './src/yuv-canvas.js'
            }
          }]]
        }
      }
    },
    copy: {
      options: {},
      files: {
        dest: 'build/demo.html',
        src: 'src/demo.html'
      }
    }
  });

  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-text-replace');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-copy');

  grunt.registerTask('default', ['eslint', 'replace', 'browserify', 'copy']);

};
