/* eslint-global describe, it */
const should = require('should'); // eslint-disable-line no-unused-vars
const createExpressApp = require('../src/create-express-app');
const puppeteer = require('puppeteer');
const processPath = require('../src/process-path');
const path = require('path');

const port = 9000;
const root = `http://localhost:${port}`;

process.on('unhandledRejection', console.log);

describe('process-path', () => {
  let server, processed;

  before(async () => {
    const app = createExpressApp(path.join('.', 'test', 'stubs'));
    server = await app.listen(port);

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const config = {
      inlineCSS: true,
      preloadScripts: true
    };
    processed = await processPath({ browser, path: `${root}/`, config });
    await browser.close();
  });

  after(async () => {
    await server.close();
  });

  it('should return minified markup', () => {
    processed.markup.includes('\n').should.be.false;
  });

  it('should contain generated JS-generated markup', () => {
    processed.markup.includes('<div class="test1 test2">').should.be.true;
  });

  it('should inline styles', () => {
    const { markup } = processed;

    markup.includes('<style>').should.be.true;
    markup.includes('.test1').should.be.true;
    markup.includes('.test2').should.be.true;
  });

  it('should remove link rel=stylesheet, and replace with preload', () => {
    processed.markup.includes('<link href=/index.css rel=preload as=style><noscript><link href=/index.css rel=stylesheet></noscript>').should.be.true;
  });

  it('should remove script[src] tags', () => {
    processed.markup.includes('src=/main.js').should.be.false;
  });

  it('should insert link rel=preload tags', () => {
    processed.markup.includes('<link href=/main.js rel=preload as=script>').should.be.true;
  });

  it('should return a list of links to crawl', () => {
    processed.links.should.be.an.Array;
    processed.links[0].should.equal(`${root}/test`);
  });
});
