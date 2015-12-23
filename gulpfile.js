var gulp = require('gulp');
var supervisor = require( "gulp-supervisor" );
var open = require('gulp-open');

gulp.task('default', ['supervisor', 'openurl'], function() {});
gulp.task('supervisor', function() {
  supervisor("./bin/www", {
          args: [],
          ignore: [ "node_modules", ".git", "database", "sessions", "public/stylesheets"],
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
gulp.task('openurl', function() {
	var options = {
		uri: 'http://localhost:3000',
		app: 'chrome'
	};
  gulp.src(__filename).pipe(open(options));
});