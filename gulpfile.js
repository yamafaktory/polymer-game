var browserify  = require('browserify');
var es6ify      = require('es6ify');
var gulp        = require('gulp');
var jshint      = require('gulp-jshint');
var livereload  = require('gulp-livereload');
var myth        = require('gulp-myth');
var nodemon     = require('gulp-nodemon');
var source      = require('vinyl-source-stream');
var svgmin      = require('gulp-svgmin');
var vulcanize   = require('gulp-vulcanize');

es6ify.traceurOverrides = { blockBinding: true};

var scripts = ['./*.js', './src/js/*.js'];
var tasks   = ['myth', 'svgmin', 'test', 'compile', 'vulcanize'];

gulp.task('compile', function () {
  return browserify()
    .add(es6ify.runtime)
    .transform(es6ify)
    .require(require.resolve('./src/js/game.js'), { entry: true })
    .bundle({ debug: true })
    .pipe(source('game.js'))
    .pipe(gulp.dest('./build/js'));
});

gulp.task('test', function () {
  return gulp.src(scripts)
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('myth', function () {
  return gulp.src('./src/css/*.css')
    .pipe(myth())
    .pipe(gulp.dest('./build/css'));
});

gulp.task('nodemon', function () {
  return nodemon({ script: 'server.js'})
    .on('start', tasks)
    .on('change', tasks);
});

gulp.task('svgmin', function () {
  return gulp.src('./src/images/svg/*.svg')
    .pipe(svgmin())
    .pipe(gulp.dest('./build/images'));
});

gulp.task('vulcanize', function () {
  return gulp.src('./src/html/index.html')
    .pipe(vulcanize({ dest: './', inline: false, strip: true}))
    .pipe(gulp.dest('./'))
    .pipe(livereload());
});

gulp.task('default', ['nodemon']);
