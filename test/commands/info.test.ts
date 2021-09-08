import {test} from '@oclif/test';

describe('info', () => {
	test.stdout()
		.command(['info'])
		.it('runs info', ctx => {
			expect(ctx.stdout).toContain('Library versions:');
		});
});
