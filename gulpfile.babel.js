import fs from 'fs';
import path from 'path';
import util from 'util';
import stream from 'stream';

import gulp from 'gulp';
import gulpRename from 'gulp-rename';
import gulpInsert from 'gulp-insert';
import gulpFilter from 'gulp-filter';
import gulpReplace from 'gulp-replace';
import gulpSourcemaps from 'gulp-sourcemaps';
import gulpBabel from 'gulp-babel';

const pumpP = util.promisify(stream.pipeline);
const fsReadFileP = util.promisify(fs.readFile);

async function packageJSON() {
	packageJSON.json = packageJSON.json || fsReadFileP('package.json', 'utf8');
	return JSON.parse(await packageJSON.json);
}

async function babelrc() {
	babelrc.json = babelrc.json || fsReadFileP('.babelrc', 'utf8');
	return Object.assign(JSON.parse(await babelrc.json), {
		babelrc: false
	});
}

function babelrcGetEnv(opts) {
	for (const preset of opts.presets) {
		if (preset[0] === '@babel/preset-env') {
			return preset[1];
		}
	}
	return null;
}

async function babelTarget(src, srcOpts, dest, modules) {
	// Change module.
	const babelOpts = await babelrc();
	Object.assign(babelrcGetEnv(babelOpts), {
		modules
	});

	// Read the package JSON.
	const pkg = await packageJSON();

	// Filter meta data file and create replace transform.
	const filterMeta = gulpFilter(['*/meta.ts'], {restore: true});
	const filterMetaReplaces = [
		["'@VERSION@'", JSON.stringify(pkg.version)],
		["'@NAME@'", JSON.stringify(pkg.name)]
	].map(v => gulpReplace(...v));

	await pumpP(...[
		gulp.src(src, srcOpts),
		filterMeta,
		...filterMetaReplaces,
		filterMeta.restore,
		gulpSourcemaps.init(),
		gulpBabel(babelOpts),
		gulpRename(path => {
			if (!modules && path.extname === '.js') {
				path.extname = '.mjs';
			}
		}),
		gulpSourcemaps.write('.', {
			includeContent: true,
			addComment: false,
			destPath: dest
		}),
		gulpInsert.transform((contents, file) => {
			if (/\.m?js$/i.test(file.path)) {
				const base = path.basename(file.path);
				return `${contents}\n//# sourceMappingURL=${base}.map\n`;
			}
			return contents;
		}),
		gulp.dest(dest)
	].filter(Boolean));
}

export async function buildLibCjs() {
	await babelTarget(['src/**/*.ts'], {}, 'lib', 'commonjs');
}

export async function buildLibMjs() {
	await babelTarget(['src/**/*.ts'], {}, 'lib', false);
}
