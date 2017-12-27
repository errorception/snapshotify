const cq = require('concurrent-queue');
const processPath = require('./process-path');
const puppeteer = require('puppeteer');

module.exports = async ({ paths, root }) => {
  const completed = [];
  let enqueued = [];

  const dedupeLinks = links => [...new Set(links)]
    .filter(l => l.startsWith(root))  // Don't crawl stuff that's not on our domain
    .map(l => {
      while(l.endsWith('/')) l = l.slice(0, -1); // Strip trailing slashes
      return l;
    })
    .filter(l => !completed.some(({ path }) => path === l))
    .filter(l => !enqueued.includes(l));

  const browser = await puppeteer.launch();

  const queue = cq().limit({ concurrency: 10 }).process(async path => {
    const { markup, links } = await processPath({ browser, path });
    completed.push({ path, markup });
    enqueued = enqueued.filter(p => p !== path);

    dedupeLinks(links).forEach(link => {
      enqueued.push(link);
      queue(link);
    });
  });

  dedupeLinks(paths).forEach(link => {
    enqueued.push(link);
    queue(link);
  });

  return new Promise(queue.drained)
    .then(() => browser.close())
    .then(() => completed);
};
