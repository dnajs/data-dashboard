// Gulp tasks

// Imports
import babel           from 'gulp-babel';
import browserSync     from 'browser-sync';
import concat          from 'gulp-concat';
import css             from 'gulp-postcss';
import cssFontMagician from 'postcss-font-magician';
import cssNano         from 'cssnano';
import cssPresetEnv    from 'postcss-preset-env';
import fileInclude     from 'gulp-file-include';
import fs              from 'fs';
import gap             from 'gulp-append-prepend';
import gulp            from 'gulp';
import header          from 'gulp-header';
import htmlHint        from 'gulp-htmlhint';
import less            from 'gulp-less';
import mergeStream     from 'merge-stream';
import order           from 'gulp-order';
import replace         from 'gulp-replace';
import RevAll          from 'gulp-rev-all';
import size            from 'gulp-size';
import touch           from 'gulp-touch-cmd';
import { htmlValidator } from 'gulp-w3c-html-validator';
import { readFileSync } from 'fs';

// Folders
const folder = {
   staging:  'build/step1-staging',
   minified: 'build/step2-minified',
   prod:     'build/step3-production',
   };

// Setup
const pkg =      JSON.parse(readFileSync('./package.json'));
const banner =   `${pkg.name} v${pkg.version} ~~ ${pkg.homepage} ~~ ${pkg.license} License`;
const srcFiles = {
   graphics: { glob: 'src/web/assets/graphics/**/*' },
   css:      { glob: 'src/web/**/*.less', order: ['src/web/css/base.less'] },
   html:     { glob: 'src/web/root/**/*.html' },
   widgets:  { glob: 'src/web/widgets/**/*.html' },
   js:       { glob: 'src/web/**/*.js', order: ['js/config.js', '!js/setup.js'] },
   };
const libraryFiles = {
   css: [
      'node_modules/web-ignition/dist/reset.min.css',
      'node_modules/dna.js/dist/dna.css',
      'node_modules/select2/dist/css/select2.min.css',
      'node_modules/simple-datatables/dist/style.css',
      'node_modules/pretty-print-json/dist/pretty-print-json.css',
      ],
   js: [
      'node_modules/whatwg-fetch/dist/fetch.umd.js',  //needed for JSDOM when running mocha specifications
      'node_modules/moment/moment.js',  //avoid sourceMappingURL in min/moment.min.js
      ],
   jsMinified: [
      'node_modules/fetch-json/dist/fetch-json.min.js',
      'node_modules/jquery/dist/jquery.min.js',
      'node_modules/select2/dist/js/select2.min.js',
      'node_modules/chart.js/dist/chart.min.js',
      'node_modules/dna.js/dist/dna.min.js',
      'node_modules/simple-datatables/dist/umd/simple-datatables.js',
      'node_modules/web-ignition/dist/library.min.js',
      'node_modules/pretty-print-json/dist/pretty-print-json.min.js',
      ],
   };
const htmlHintConfig = { 'attr-value-double-quotes': false };
const cssPlugins = [
   cssFontMagician({ protocol: 'https:' }),
   cssPresetEnv(),
   cssNano({ autoprefixer: false }),
   ];
const transpileES6 = ['@babel/env', { modules: false }];
const preserveImportant = comment => /licen[sc]e|copyright|@preserve|^!/i.test(comment);
const babelMinifyJs = { presets: [transpileES6, 'minify'], shouldPrintComment: preserveImportant };
babelMinifyJs.presets[1] = ['minify', { builtIns: false }];  //HACK: workaround "Couldn't find intersection" error, https://github.com/babel/minify/issues/904
const onePixelSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';
const placeholderSvg = `"data:image/svg+xml;base64,${Buffer.from(onePixelSvg).toString('base64')}"`;

// Tasks
const task = {
   packageLibraries: {
      css() {
         return gulp.src(libraryFiles.css)
            .pipe(header('/*! 3rd party style: ${filename} */\n'))
            .pipe(concat('libraries.css'))
            .pipe(size({ showFiles: true }))
            .pipe(gulp.dest(folder.staging))
            .pipe(touch());
         },
      js() {
         return gulp.src(libraryFiles.js)
            .pipe(header('//! 3rd party library: ${filename}\n'))
            .pipe(concat('libraries.js'))
            .pipe(size({ showFiles: true }))
            .pipe(gulp.dest(folder.staging))
            .pipe(touch());
         },
      jsMinified() {
         return gulp.src(libraryFiles.jsMinified)
            .pipe(header('//! 3rd party library (minified): ${filename}\n'))
            .pipe(gap.appendText('\n'))
            .pipe(concat('libraries.dist.js'))
            .pipe(size({ showFiles: true }))
            .pipe(gulp.dest(folder.staging))
            .pipe(touch());
         },
      all() {
         return mergeStream(
            task.packageLibraries.css(),
            task.packageLibraries.js(),
            task.packageLibraries.jsMinified(),
            );
         },
      },
   buildIncludes: {
      generate(name, glob, dest) {
         return gulp.src(glob)
            .pipe(order())
            .pipe(replace(/.*[\n]/gm, ''))
            .pipe(header('@@include("../../' + name + '/${file.relative}")'))
            .pipe(concat(name + '.gen.html'))
            .pipe(gap.prependText('\n'))
            .pipe(gap.appendText('\n'))
            .pipe(size({ showFiles: true }))
            .pipe(gulp.dest(dest));
         },
      widgets() {
         return task.buildIncludes.generate('widgets', srcFiles.widgets.glob, 'src/web/html/generated');
         },
      },
   buildWebApp: {
      graphics() {
         return gulp.src(srcFiles.graphics.glob)
            .pipe(gulp.dest(folder.staging + '/graphics'));
         },
      css() {
         return gulp.src(srcFiles.css.glob)
            .pipe(order(srcFiles.css.order))
            .pipe(less())
            .pipe(concat(pkg.name + '.css'))
            .pipe(size({ showFiles: true }))
            .pipe(gulp.dest(folder.staging));
         },
      html() {
         return gulp.src(srcFiles.html.glob)
            .pipe(fileInclude({ indent: true, context: { pkg } }))
            .pipe(htmlHint(htmlHintConfig))
            .pipe(htmlHint.reporter())
            .pipe(htmlValidator.analyzer())
            .pipe(htmlValidator.reporter())
            .pipe(replace('src=#', 'src=' + placeholderSvg))
            .pipe(size({ showFiles: true }))
            .pipe(gulp.dest(folder.staging))
            .pipe(touch());
         },
      js() {
         return gulp.src(srcFiles.js.glob)
            .pipe(order(srcFiles.js.order))
            .pipe(concat(pkg.name + '.js'))
            .pipe(size({ showFiles: true }))
            .pipe(gulp.dest(folder.staging));
         },
      all() {
         return mergeStream(
            task.buildWebApp.graphics(),
            task.buildWebApp.css(),
            task.buildWebApp.js(),
            task.buildWebApp.html(),
            );
         },
      },
   minifyWebApp() {
      const embeddedComment = /([^\n])(\/\/[*]! )/g;
      const copyGraphics = () => gulp.src(folder.staging + '/graphics/**/*')
         .pipe(gulp.dest(folder.minified + '/graphics'));
      const copyHtml = () => gulp.src(folder.staging + '/*.html')
         .pipe(gulp.dest(folder.minified));
      const minifyLibCss = () => gulp.src(folder.staging + '/libraries.css')
         .pipe(css(cssPlugins))
         .pipe(header('/*! Bundle: 3rd party styles */\n\n'))
         .pipe(gap.appendText('\n'))
         .pipe(gulp.dest(folder.minified));
      const minifyLibJs = () => gulp.src(libraryFiles.js)
         .pipe(babel(babelMinifyJs))
         .pipe(replace(embeddedComment, '$1\n$2'))
         .pipe(header('\n//! 3rd party library: ${filename}\n'))
         .pipe(concat('libraries.js'))
         .pipe(header('//! Bundle: 3rd party libraries\n'))
         .pipe(gap.appendText('\n'))
         .pipe(gulp.dest(folder.minified))
         .pipe(touch());
      const copyLibDistJs = () => gulp.src(folder.staging + '/libraries.dist.js')
         .pipe(header('//! Bundle: 3rd party libraries (minified)\n\n'))
         .pipe(gulp.dest(folder.minified));
      const minifyCss = () => gulp.src(folder.staging + '/' + pkg.name + '.css')
         .pipe(css(cssPlugins))
         .pipe(header('/*! ' + banner + ' */\n'))
         .pipe(gulp.dest(folder.minified));
      const minifyJs = () => gulp.src(folder.staging + '/' + pkg.name + '.js')
         .pipe(babel(babelMinifyJs))
         .pipe(header('//! ' + banner + '\n'))
         .pipe(gap.appendText('\n'))
         .pipe(gulp.dest(folder.minified));
      return mergeStream(
         copyGraphics(),
         copyHtml(),
         minifyLibCss(),
         minifyLibJs(),
         copyLibDistJs(),
         minifyCss(),
         minifyJs());
      },
   hashWebApp() {
      return gulp.src(folder.minified + '/**/*')
         .pipe(RevAll.revision({ dontRenameFile: ['.html'] }))
         .pipe(replace('./graphics/logo-card', pkg.homepage + '/graphics/logo-card'))  //og:image
         .pipe(gulp.dest(folder.prod))
         .pipe(size({ showFiles: true, gzip: true }));
      },
   publishDocsWebsite() {
      fs.mkdirSync('docs');
      fs.writeFileSync('docs/CNAME', 'data-dashboard.js.org\n');
      return gulp.src(folder.prod + '/**/*')
         .pipe(gulp.dest('docs'))
         .pipe(size({ showFiles: true }));
      },
   compound: {
      build: () => gulp.series(
         task.packageLibraries.all,
         task.buildIncludes.widgets,
         task.buildWebApp.all,
         ),
      buildHtml: () => gulp.series(
         task.buildIncludes.widgets,
         task.buildWebApp.html,
         ),
      },
   setupWatchers() {
      gulp.watch('src/web/**/*.+(jpg|png|svg)',                   task.buildWebApp.graphics);
      gulp.watch('src/web/**/*.less',                             task.buildWebApp.css);
      gulp.watch('src/web/**/*.js',                               task.buildWebApp.js);
      gulp.watch(['src/web/**/*.html', '!src/web/**/*.gen.html'], task.compound.buildHtml());
      const sync = browserSync.create();
      sync.init({ server: { baseDir: folder.staging } });
      gulp.watch(folder.staging + '/**/*').on('change', sync.reload);
      },
   };

// Gulp
gulp.task('build',  task.compound.build());
gulp.task('minify', task.minifyWebApp);
gulp.task('hash',   task.hashWebApp);
gulp.task('docs',   task.publishDocsWebsite);
gulp.task('watch',  task.setupWatchers);
