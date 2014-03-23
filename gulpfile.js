var gulp      = require('gulp'),
    myth      = require('gulp-myth'),
    nodemon   = require('gulp-nodemon'),
    svgmin    = require('gulp-svgmin'),
    vulcanize = require('gulp-vulcanize');

gulp.task('myth', function () {
  gulp.src('./src/css/*.css')
    .pipe(myth())
    .pipe(gulp.dest('./build/css'));
});

gulp.task('nodemon', function () {
  nodemon({ script: 'server.js'})
    .on('start', ['myth', 'svgmin', 'vulcanize'])
    .on('change', ['myth', 'svgmin', 'vulcanize'])
})

gulp.task('svgmin', function () {
  gulp.src('./src/images/svg/*.svg')
    .pipe(svgmin())
    .pipe(gulp.dest('./build/images'));
});

gulp.task('vulcanize', function () {
  gulp.src('./src/html/index.html')
    .pipe(vulcanize({ dest: './', inline: false, strip: true}))
    .pipe(gulp.dest('./'));
});

gulp.task('default', ['nodemon']);