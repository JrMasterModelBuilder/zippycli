'use strict';

// Get TypeScript loading support using the test config, works on Node level.
// eslint-disable-next-line no-process-env
process.env.TS_NODE_PROJECT = require('path').resolve('test/tsconfig.json');

require('ts-node').register();
