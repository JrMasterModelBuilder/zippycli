import fs from 'fs';
import path from 'path';
import stream from 'stream';
import util from 'util';

import gulp from 'gulp';
import gulpRename from 'gulp-rename';
import gulpInsert from 'gulp-insert';
import gulpFilter from 'gulp-filter';
import gulpReplace from 'gulp-replace';
import gulpSourcemaps from 'gulp-sourcemaps';
import gulpBabel from 'gulp-babel';
import execa from 'execa';
import del from 'del';

const readFile = util.promisify(fs.readFile);
const pipeline = util.promisify(stream.pipeline);

async function exec(cmd: string, args: string[] = []) {
	await execa(cmd, args, {
		preferLocal: true,
		stdio: 'inherit'
	});
}

async function packageJson() {
	return JSON.parse(await readFile('package.json', 'utf8')) as {
		[p: string]: string;
	};
}

async function babelrc() {
	return {
		...JSON.parse(await readFile('.babelrc', 'utf8')),
		babelrc: false
	} as {
		presets: [string, {modules: boolean | string}][];
		babelOpts: unknown[];
		cacheDirectory?: boolean;
		plugins: [string, unknown];
	};
}

async function babelTarget(
	src: string[],
	srcOpts: any,
	dest: string,
	modules: string | boolean
) {
	// Change module.
	const babelOptions = await babelrc();
	for (const preset of babelOptions.presets) {
		if (preset[0] === '@babel/preset-env') {
			preset[1].modules = modules;
		}
	}
	if (!modules) {
		babelOptions.plugins.push([
			'esm-resolver',
			{
				source: {
					extensions: [
						[
							['.js', '.mjs', '.jsx', '.mjsx', '.ts', '.tsx'],
							'.mjs'
						]
					]
				}
			}
		]);
	}

	// Read the package JSON.
	const pkg = await packageJson();

	// Filter meta data file and create replace transform.
	const filterMeta = gulpFilter(['*/meta.ts'], {restore: true});
	const filterMetaReplaces = [
		["'@VERSION@'", JSON.stringify(pkg.version)],
		["'@NAME@'", JSON.stringify(pkg.name)]
	].map(([f, r]) => gulpReplace(f, r));

	await pipeline(
		gulp.src(src, srcOpts),
		filterMeta,
		...filterMetaReplaces,
		filterMeta.restore,
		gulpSourcemaps.init(),
		gulpBabel(babelOptions as unknown),
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
			// Manually append sourcemap comment.
			if (/\.m?js$/i.test(file.path)) {
				const base = path.basename(file.path);
				return `${contents}\n//# sourceMappingURL=${base}.map\n`;
			}
			return contents;
		}),
		gulp.dest(dest)
	);
}

// clean

gulp.task('clean:logs', async () => {
	await del(['npm-debug.log*', 'yarn-debug.log*', 'yarn-error.log*']);
});

gulp.task('clean:lib', async () => {
	await del(['lib']);
});

gulp.task('clean:manifest', async () => {
	await del(['oclif.manifest.json']);
});

gulp.task(
	'clean',
	gulp.parallel(['clean:logs', 'clean:lib', 'clean:manifest'])
);

// lint

gulp.task('lint:es', async () => {
	await exec('eslint', ['.']);
});

gulp.task('lint', gulp.parallel(['lint:es']));

// build

gulp.task('build:lib:dts', async () => {
	await exec('tsc');
});

gulp.task('build:lib:cjs', async () => {
	await babelTarget(['src/**/*.ts'], {}, 'lib', 'commonjs');
});

gulp.task('build:lib:mjs', async () => {
	await babelTarget(['src/**/*.ts'], {}, 'lib', false);
});

gulp.task(
	'build:lib',
	gulp.parallel(['build:lib:dts', 'build:lib:cjs', 'build:lib:mjs'])
);

gulp.task('build:manifest', async () => {
	await exec('oclif-dev', ['manifest']);
});

gulp.task('build:readme', async () => {
	await exec('oclif-dev', ['readme']);
});

gulp.task(
	'build',
	gulp.parallel(['build:lib', 'build:manifest', 'build:readme'])
);

// test

gulp.task('test:node', async () => {
	await exec('jasmine');
});

gulp.task('test', gulp.parallel(['test:node']));

// watch

gulp.task('watch', () => {
	gulp.watch(['src/**/*', 'test/**/*'], gulp.series(['all']));
});

// all

gulp.task('all', gulp.series(['clean', 'build', 'test', 'lint']));

// prepack

gulp.task('prepack', gulp.series(['clean', 'build']));

// default

gulp.task('default', gulp.series(['all']));
