var gulp = require('gulp');
var browserSync = require('browser-sync');
var supervisor = require( "gulp-supervisor" );

gulp.task('default', ['browser-sync'], function() {});

gulp.task('browser-sync', ['supervisor'], function() {
  browserSync.init(null, {
    proxy: "http://localhost:3000",
    files: ["**/*.*"],
    browser: "google chrome",
    port: 7000,
  });
});
gulp.task('supervisor', function() {
  supervisor( "./bin/www", {
          args: [],
          ignore: [ "node_modules" ],
          pollInterval: 500,
          extensions: [ "js" ],
          exec: "node",
          debug: true,
          debugBrk: false,
          harmony: false,
          noRestartOn: false,
          forceWatch: true,
          quiet: false
      } );
});
