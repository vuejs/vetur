import ClientConfig from './client/rollup.config.js';
import VlsConfigs from './server/rollup.config.js';
import VtiConfig from './vti/rollup.config.js';

export default [ClientConfig, ...VlsConfigs, VtiConfig];
