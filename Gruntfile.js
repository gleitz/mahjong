/* global module */
module.exports = function(grunt) {
    var port = grunt.option('port') || 3000;
    // Project configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        meta: {
            banner:
                '/*!\n' +
                ' * mahjong.js <%= pkg.version %> (<%= grunt.template.today("yyyy-mm-dd, HH:MM") %>)\n' +
                ' * http://gleitzman.com/apps/mahjong/game\n' +
                ' * MIT licensed\n' +
                ' *\n' +
                ' * Copyright (C) 2013 Benjamin Gleitzman, http://gleitzman.com\n' +
                ' */'
        },

        uglify: {
            options: {
                banner: '<%= meta.banner %>\n'
            },
            build: {
                src: ['public/js/global/**/*.js', 'public/js/src/**/*.js'],
                dest: 'public/js/dist/all.min.js'
            }
        },

        cssmin: {
            compress: {
                files: {
                    'public/css/dist/all.min.css': [ 'public/css/src/**/*.css' ]
                }
            }
        },

        watch: {
            files: ['public/**/*.*'],
            tasks: ['cssmin', 'uglify', 'watch']
        }

    });

    // Dependencies
    grunt.loadNpmTasks( 'grunt-contrib-cssmin' );
    grunt.loadNpmTasks( 'grunt-contrib-uglify' );
    grunt.loadNpmTasks( 'grunt-contrib-watch' );

    // Compression task
    grunt.registerTask( 'compress', [ 'cssmin', 'uglify', 'watch' ] ); // add mocha tests

    // Run tests
    grunt.registerTask( 'test', [ 'jshint', 'qunit' ] );

    // Start the app
    grunt.registerTask('default', function () {
        grunt.util.spawn(
            {cmd: 'node',
             args: ['app.js']});

        grunt.task.run('compress');
    });

};
