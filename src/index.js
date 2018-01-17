#!/usr/bin/env node

const program = require('commander');
const crawl = require('./crawler');
const createExpressApp = require('./create-express-app');
const path = require('path');
const mkdirp = require('mkdirp');
const { writeFile, readFileSync } = require('fs');
const { promisify } = require('util');
const { gzip } = require('zlib');
const pgzip = promisify(gzip);

const defaultConfig = {
  inlineCSS: true,
  preloadScripts: true,
  preloadFonts: true,
  dryRun: false,
  printConsoleLogs: false
};

process.on('unhandledRejection', console.log);

program
  .version(JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'))).version)
  .option('-c, --config', 'Configuration file');

const configFile = program.config || path.join(process.cwd(), 'snapshot.json');

let config = {};
try {
  config = JSON.parse(readFileSync(configFile));
} catch(e) {}

config = { ...config, ...defaultConfig };

const port = 9000;
const root = `http://localhost:${port}`;

const fileNameFromPath = path => {
  const pathSnipped = path.slice(root.length);
  return `build${pathSnipped}${!pathSnipped ? '/index' : ''}.html`;
};

const write = async (diskPath, markup) => {
  const fullPath = path.resolve(process.cwd(), fileNameFromPath(diskPath));
  await new Promise(r => mkdirp(path.dirname(fullPath), r));
  await promisify(writeFile)(fullPath, markup);
};

(async () => {
  const startTime = new Date();
  console.log('Snapshotifying...');

  const app = createExpressApp(path.join(process.cwd(), 'build'));
  const server = await app.listen(port);
  const filesToWrite = await crawl({ paths: [`${root}/`], root, config });
  await server.close();

  if(!config.dryRun) {
    await Promise.all(filesToWrite.map(({ path, markup }) => write(path, markup)));
  }

  // Snapshot report
  console.log('\nFile sizes after gzip:\n');

  (await Promise.all(
    filesToWrite.map(async ({ path, markup }) => ({ path, gzipped: await pgzip(markup) }))
  )).forEach(({ path, gzipped }) => {
    const gzippedSize = (gzipped.length / 1024).toFixed(2);
    const pathSnipped = path.slice(root.length) || '/';
    const paddedGzippedSize = `     ${gzippedSize}`;

    console.log(`${paddedGzippedSize.substr(paddedGzippedSize.length - 8)} KB  \x1b[36m${pathSnipped}\x1b[0m → \x1b[2m${fileNameFromPath(path)}\x1b[0m`);
  });

  console.log('\n');
  console.log(`\x1b[2mSnapshotted ${filesToWrite.length} pages in ${((Date.now() - startTime)/1000).toFixed(2)}s.\x1b[0m\n`);

  process.exit();
})();
