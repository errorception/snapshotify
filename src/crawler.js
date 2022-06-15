const cq = require('concurrent-queue');
const processPath = require('./process-path');
const puppeteer = require('puppeteer');

module.exports = async ({ paths, root, config }) => {
  const completed = [];
  const enqueued = [];

  const dedupeLinks = links => [...new Set(links)]
    .filter(l => l.startsWith(root))  // Don't crawl stuff that's not on our domain
    .map(l => {
      while(l.endsWith('/')) l = l.slice(0, -1); // Strip trailing slashes
      return l;
    })
    .filter(l => !enqueued.includes(l))   // Ensure we haven't seen it before
    .map(l => { enqueued.push(l); return l; }); // Remember, and return

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const queue = cq().limit({ concurrency: 10 }).process(async path => {
    try {
      const { markup, links, lint } = await processPath({ browser, path, config });
      completed.push({ path, markup, lint });

      dedupeLinks(links).forEach(link => queue(link));
    } catch(e) {
      console.error(e);
      throw e;
    }
  });

  dedupeLinks(paths).forEach(link => queue(link));

  return new Promise(queue.drained)
    .then(() => browser.close())
    .then(() => completed);
};
