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
                    'css/main.min.css': [ 'css/reveal.css', 'css/main.css' ]
                }
            }
        },

        sass: {
            main: {
                files: {
                    'css/theme/default.css': 'css/theme/source/default.scss',
                    'css/theme/beige.css': 'css/theme/source/beige.scss',
                    'css/theme/night.css': 'css/theme/source/night.scss',
                    'css/theme/serif.css': 'css/theme/source/serif.scss',
                    'css/theme/simple.css': 'css/theme/source/simple.scss',
                    'css/theme/sky.css': 'css/theme/source/sky.scss',
                    'css/theme/moon.css': 'css/theme/source/moon.scss',
                    'css/theme/solarized.css': 'css/theme/source/solarized.scss'
                }
            }
        },

        jshint: {
            options: {
                curly: false,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                eqnull: true,
                browser: true,
                expr: true,
                globals: {
                    head: false,
                    module: false,
                    console: false
                }
            },
            files: [ 'Gruntfile.js', 'js/reveal.js' ]
        },

        connect: {
            server: {
                options: {
                    port: port,
                    base: '.'
                }
            }
        },

        zip: {
            'reveal-js-presentation.zip': [
                'index.html',
                'css/**',
                'js/**',
                'lib/**',
                'images/**',
                'plugin/**'
            ]
        },

        watch: {
            main: {
                files: [ 'Gruntfile.js', 'js/reveal.js', 'css/reveal.css' ],
                tasks: 'default'
            },
            theme: {
                files: [ 'css/theme/source/*.scss', 'css/theme/template/*.scss' ],
                tasks: 'themes'
            }
        }

    });

    // Dependencies
    grunt.loadNpmTasks( 'grunt-contrib-jshint' );
    grunt.loadNpmTasks( 'grunt-contrib-cssmin' );
    grunt.loadNpmTasks( 'grunt-contrib-uglify' );
    grunt.loadNpmTasks( 'grunt-contrib-watch' );
    grunt.loadNpmTasks( 'grunt-contrib-sass' );
    grunt.loadNpmTasks( 'grunt-contrib-connect' );
    grunt.loadNpmTasks( 'grunt-zip' );

    // Default task
    grunt.registerTask( 'default', [ 'jshint', 'cssmin', 'uglify', 'qunit' ] );

    // Theme task
    grunt.registerTask( 'themes', [ 'sass' ] );

    // Package presentation to archive
    grunt.registerTask( 'package', [ 'default', 'zip' ] );

    // Serve presentation locally
    grunt.registerTask( 'serve', [ 'connect', 'watch' ] );

    // Run tests
    grunt.registerTask( 'test', [ 'jshint', 'qunit' ] );

};
