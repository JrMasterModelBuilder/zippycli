// This file contains compile-time defined variables.
// Variables are wrapped in object to avoid source values in .d.ts files.

const vars = {
	NAME: '@NAME@',
	VERSION: '@VERSION@'
};

export const NAME = vars.NAME;

export const VERSION = vars.VERSION;
