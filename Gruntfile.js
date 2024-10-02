module.exports = function(grunt) {
    'use strict';

    grunt.initConfig({
        concurrent: {
            tasks: ['watch'],
            options: {
                logConcurrentOutput: true
            }
        },
        watch: {
            test: {
                files: ['test/**/*.js'],
                tasks: [
                    'karma'
                ],
                options: {
                    livereload: true
                }
            },
            js: {
                files: ['src/**'],
                tasks: [
                    'closureCompiler',
                    'karma',
                    'jshint'
                ],
                options: {
                    livereload: true
                }
            }
        },
        jshint: {
            all: [
                'src/**/*.js'
            ],
            options: {
                jshintrc: true
            }
        },
        karma: {
            options: {
                frameworks: ['mocha', 'chai'],
                files: [
                    'extern/blockly/blockly_compressed.js',
                    'dist/entry.js'
                ]
            },
            unit: {
                configFile: 'karma.conf.js',
                logLevel: 'ERROR',
                files: [
                    { src : ['test/**/*.js'] }
                ]
            }
        },
        closureCompiler: {
            options: {
                compilerFile: 'node_modules/closurecompiler/compiler/compiler.jar',
                checkModified: true,
                compilerOpts: {
                    compilation_level: 'SIMPLE_OPTIMIZATIONS',
                    formatting: 'pretty_print'
                }
            },
            targetName: {
                src: ['src/entry.js', 'src/**/*.js'],
                dest: 'dist/entry.js'
            },
            dist: {
                options: {
                    compilerOpts: {
                        compilation_level: 'SIMPLE_OPTIMIZATIONS'
                    }
                },
                expand: false,
                src: ['src/entry.js', 'src/**/*.js'],
                dest: 'dist/entry.min.js',
                ext: '.min.js'
            }
        }
    });

    // Load NPM tasks
    grunt.loadNpmTasks('grunt-closure-tools');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-karma');

    // Default tasks.
    grunt.registerTask('default', [
        'closureCompiler',
        'karma',
        'jshint'
    ]);

    grunt.registerTask('development', [
        'closureCompiler',
        'karma',
        'jshint',
        'concurrent'
    ]);

    grunt.registerTask('closure', ['closureCompiler']);
};
