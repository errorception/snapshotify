#!/usr/bin/env node

const crawlQueue = require('./crawl-queue');
const createExpressApp = require('./create-express-app');
const processPath = require('./process-path');
const path = require('path');
const puppeteer = require('puppeteer');
const mkdirp = require('mkdirp');
const { writeFile } = require('fs');
const { promisify } = require('util');
const { gzipSync } = require('zlib');

process.on('unhandledRejection', console.log);

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
  const queue = crawlQueue(root);

  queue.add([`${root}/`]);
  const filesToWrite = [];

  const browser = await puppeteer.launch();

  while(queue.hasItems()) {
    await queue.next(async path => {
      const { markup, links } = await processPath({ browser, path });

      filesToWrite.push({ path, markup });
      queue.add(links);
    });
  }

  await browser.close();

  await Promise.all(filesToWrite.map(({ path, markup }) => write(path, markup)));
  await server.close();

  // Snapshot report
  console.log('\nFile sizes after gzip:\n');

  filesToWrite.forEach(({ path, markup }) => {
    const gzippedSize = (gzipSync(markup).length / 1024).toFixed(2);
    const pathSnipped = path.slice(root.length) || '/';
    const paddedGzippedSize = `     ${gzippedSize}`;

    console.log(`${paddedGzippedSize.substr(paddedGzippedSize.length - 8)} KB  \x1b[36m${pathSnipped}\x1b[0m → \x1b[2m${fileNameFromPath(path)}\x1b[0m`);
  });

  console.log('\n');
  console.log(`\x1b[2mSnapshot generated in ${((Date.now() - startTime)/1000).toFixed(2)}s.\x1b[0m\n`);

  process.exit();
})();
