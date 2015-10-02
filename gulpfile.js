var gulp = require('gulp');
var supervisor = require( "gulp-supervisor" );

gulp.task('default', ['supervisor'], function() {});
gulp.task('supervisor', function() {
  supervisor( "./bin/www", {
          args: [],
          ignore: [ "node_modules", ".git" ],
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
