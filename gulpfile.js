const { src, dest, series, watch } = require('gulp')
const sass = require('gulp-sass')(require('sass'))
const concat = require('gulp-concat')
const htmlMin = require('gulp-htmlmin')
const autoprefixes = require('gulp-autoprefixer')
const cleanCSS = require('gulp-clean-css')
const svgSprite = require('gulp-svg-sprite')
const image = require('gulp-image')
const babel = require('gulp-babel')
const fileInclude = require('gulp-file-include')
const uglify = require('gulp-uglify-es').default
const notify = require('gulp-notify')
const sourcemaps = require('gulp-sourcemaps')
const del = require('del')
const browserSync = require('browser-sync').create()
const versionNumber = require('gulp-version-number')
const gulpif = require('gulp-if')
const ttf2woff = require('gulp-ttf2woff')
const ttf2woff2 = require('gulp-ttf2woff2')
const plumber = require('gulp-plumber')
const sitemap = require('gulp-sitemap')


const fonts = (done) => {
    // Сначала конвертируем в woff
    src('src/fonts/**/*.ttf')
        .pipe(ttf2woff())
        .pipe(dest('dist/fonts'))
        .pipe(dest('build/fonts'))
        .on('end', () => {
            // После завершения первой конвертации, конвертируем в woff2
            src('src/fonts/**/*.ttf')
                .pipe(ttf2woff2())
                .pipe(dest('dist/fonts'))
                .pipe(dest('build/fonts'))
                .on('end', done);
        });
}

let prod = false

const isProd = (done) => {
    prod = true;
    done();
}

const clean = () => {
    return del(['dist', 'build'])
}

const styles = () => {
    return src('src/styles/**/*.scss')
        .pipe(gulpif(!prod, sourcemaps.init()))
        .pipe(gulpif(!prod, sourcemaps.write()))
        .pipe(sass({
            outputStyle: 'expanded'
        }).on('error', notify.onError))

        .pipe(concat('main.css'))
        .pipe(autoprefixes({
            cascade: false
        }))
        .pipe(gulpif(prod, cleanCSS({
            level: 2
        })))
        .pipe(dest('dist'))
        .pipe(dest('build'))
        .pipe(browserSync.stream())
}

const htmlMinify = () => {
    return src('src/**/*.html')
        .pipe(fileInclude())
        .pipe(gulpif(prod, htmlMin({
            collapseWhitespace: true,
            minifyJS: true,
            removeComments: true,
        })))
        .pipe(versionNumber({
            'value': '%DT%',
            'append': {
                'key': '_v',
                'cover': 0,
                'to': [
                    'css',
                    'js',
                ]
            },
            'output': {
                'file': 'src/version.json'
            }
        }))
        .pipe(dest('dist'))
        .pipe(dest('build'))
        .pipe(browserSync.stream())
}

const svgSprites = () => {
    return src('src/images/svg/**/*.svg')
        .pipe(svgSprite({
            mode: {
                stack: {
                    sprite: '../sprite.svg'
                }
            }
        }))
        .pipe(dest('dist/images/svg'))
        .pipe(dest('build/images/svg'))
}

const scripts = () => {
    return src([
        'src/js/components/**/*.js',
        'src/js/main.js'
    ])
        .pipe(gulpif(!prod, sourcemaps.init()))
        .pipe(babel({
            presets: ['@babel/env']
        }))
        .pipe(concat('app.js'))
        .pipe(gulpif(prod, uglify({
            toplevel: true
        }).on('error', notify.onError())))
        .pipe(gulpif(!prod, sourcemaps.write()))
        .pipe(dest('./dist'))
        .pipe(dest('./build'))
        .pipe(browserSync.stream())
}

const images = (done) => {
    src([
        'src/images/img/**/*.png',
        'src/images/img/**/*.jpg',
        'src/images/img/**/*.JPG',
        'src/images/img/**/*.jpeg',
        'src/images/img/**/*.svg',
    ], { allowEmpty: true })
        .pipe(dest('dist/images/img'))
        .pipe(dest('build/images/img'))
        .on('end', done);
}

const imagesCopy = () => {
    return src([
        'src/images/img/**/*.webp',
        'src/images/img/**/*.mp4',
        'src/images/img/**/*.MP4',
        'src/images/img/**/*.MOV',
        'src/images/img/**/*.ico',
        'src/images/img/**/*.pdf',
    ])
        .pipe(dest('dist/images/img'))
        .pipe(dest('build/images/img'))
}

const resources = () => {
    return src('src/resources/**')
        .pipe(dest('dist'))
        .pipe(dest('build'))
}

const serve = (done) => {
    browserSync.init({
        server: {
            baseDir: 'dist'
        }
    });
    done();
}

const watchFiles = () => {
    // Наблюдатели
    watch('src/styles/**/*.scss', styles);
    watch('src/**/*.html', htmlMinify);
    watch('src/fonts/**/*.ttf', fonts);
    watch('src/images/img/**/*.jpg', images);
    watch('src/images/img/**/*.png', images);
    watch('src/images/img/**/*.jpeg', images);
    watch('src/images/img/**/*.svg', images);
    watch('src/images/img/**/*.pdf', imagesCopy);
    watch('src/images/img/**/*.webp', imagesCopy);
    watch('src/images/svg/**.svg', svgSprites);
    watch('src/js/**/*.js', scripts);
    watch('src/resources/**', resources);
}

const sitemapTask = () => {
    return src('build/**/*.html', { read: false })
        .pipe(sitemap({
            siteUrl: 'https://lazurprint.ru',
            mappings: {
                'index.html': {
                    priority: 1.0,
                    changefreq: 'daily'
                },
                '*.html': {
                    priority: 0.8,
                    changefreq: 'weekly'
                }
            }
        }))
        .pipe(dest('build/resources'))
        .pipe(dest('dist/resources'))
}

exports.styles = styles
exports.htmlMinify = htmlMinify
exports.scripts = scripts
exports.sitemap = sitemapTask
exports.dev = series(clean, fonts, resources, htmlMinify, scripts, styles, images, imagesCopy, svgSprites, serve, watchFiles)
exports.build = series(isProd, clean, fonts, resources, htmlMinify, scripts, styles, images, imagesCopy, svgSprites, sitemapTask)