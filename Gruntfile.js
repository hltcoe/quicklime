//To build dist/concrete.js, run grunt at the command line in this directory.
//Prerequisites:
// Node Setup -   nodejs.org
// Grunt Setup -  npm install  //reads the ./package.json and installs project dependencies

module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: [
        'Gruntfile.js', 
        'quicklime/static/quicklime/quicklime*.js'
      ],
      options: {
        // options here to override JSHint defaults
        globals: {
          jQuery: true,
          console: true,
          module: true,
          document: true
        }
      }
    },
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-shell');

  grunt.registerTask('test', ['jshint']);
  grunt.registerTask('default', ['jshint']);
};
