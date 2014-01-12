/* global module */
module.exports = function(grunt) {
    var port = grunt.option('port') || 3000,
        js_src_files = ['public/js/global/**/*.js',
                        'shared/**/*.js',
                        'public/js/src/**/*.js'],
        less_src_files = ['public/css/src/**/*.less'];

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

        concat: {
            options: {
                separator: ';\n'
            },
            dist: {
                src: js_src_files,
                dest: 'public/js/dist/all.js'
            }
        },

        uglify: {
            options: {
                banner: '<%= meta.banner %>\n'
            },
            build: {
                src: js_src_files,
                dest: 'public/js/dist/all.min.js'
            }
        },

        less: {
            development: {
                files: {
                    'public/css/dist/all.css': less_src_files
                }
            },
            production: {
                options: {
                    cleancss: true
                },
                files: {
                    'public/css/dist/all.min.css': less_src_files
                }
            }
        },

        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: ['test/**/*.js']
            }
        },

        concurrent: {
            compress: ['less', 'concat', 'uglify'],
            start: {
                tasks: ['mochaTest', 'nodemon', 'watch'],
                options: {
                    logConcurrentOutput: true
                }
            }
        },

        nodemon: {
            dev: {
                options: {
                    nodeArgs: ['--port', port]
                }
            }
        },

        watch: {
            files: ['public/**/*.*',
                    'shared/**/*.*',
                    'views/partials/**/*.*',
                    '!**/dist/**'], // ignore dist folder
            tasks: ['concurrent:compress']
        }

    });

    // Dependencies
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-concurrent');

    // Run tests
    grunt.registerTask('test', [ 'mochaTest' ] );

    // Default tasks
    grunt.registerTask('default', ['concurrent:start']);
};
