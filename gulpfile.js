(function() {

  var gulp   = require('gulp'),
      jshint = require('gulp-jshint');

  gulp.task('lint', function() {
    return gulp.src(['*.js', 'components/*.js'])
      .pipe(jshint())
      .pipe(jshint.reporter('jshint-stylish'));
    //.pipe(jshint.reporter('default'));
  });

  gulp.task('watch', function() {
    gulp.watch(['*.js'], ['components/*.js']);
  });

  gulp.task('default', ['watch']);
}());