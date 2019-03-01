import {test} from '@oclif/test';

import {avatar} from '../data';

describe('extract', () => {
	test
		.stdout()
		.command(['extract', avatar.url])
		.it('format: text (default)', ctx => {
			expect(ctx.stdout).toContain(`source: ${avatar.url}`);
			expect(ctx.stdout).toContain('download: http');
			expect(ctx.stdout).toContain(`filename: ${avatar.filename}`);
		});

	test
		.stdout()
		.command(['extract', '-f', 'json', avatar.url])
		.it('format: json', ctx => {
			const list = JSON.parse(ctx.stdout);
			expect(Array.isArray(list)).toBe(true);
			expect(list.length).toBe(1);
			const info = list[0];
			expect(info.source).toBe(avatar.url);
			expect(info.download).toMatch(/^https?:\/\//);
			expect(info.filename).toBe(avatar.filename);
		});
});
