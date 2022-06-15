/* eslint-global describe, it */
const should = require('should'); // eslint-disable-line no-unused-vars
const createExpressApp = require('../src/create-express-app');
const puppeteer = require('puppeteer');
const path = require('path');
const delay = require('delay2');
const minCss = require('../src/min-css');

const port = 9000;
const root = `http://localhost:${port}`;

process.on('unhandledRejection', console.log);

describe('min-css', () => {
  let server, css, fonts, page, browser;

  before(async () => {
    const app = createExpressApp(path.join('.', 'test', 'stubs'));
    server = await app.listen(port);

    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();

    page.on('console', msg => {
      for (let i = 0; i < msg.args.length; ++i) {
        console.log(`[browser-console] - ${path} - ${i}: ${msg.args[i]}`);
      }
    });

    await page.goto(`${root}/`);
    await delay(50);

    const result = await minCss(page);
    css = result.css;
    fonts = result.fonts;
  });

  after(async () => {
    await server.close();
    await page.close();
    await browser.close();
  });

  it('should return minimal css', async () => {
    css.length.should.be.greaterThan(0);
    css.includes('.test1').should.be.true();
    css.includes('.test2').should.be.true();
  });

  it('should not return unused selectors', () => {
    css.includes('.test-foo').should.be.false();
    css.includes('.test3').should.be.false();
  });

  it('should return used keyframes', () => {
    css.includes('test_anim').should.be.true();
  });

  it('should not return unused keyframes', () => {
    css.includes('test_anim2').should.be.false();
  });

  it('should return the list of fonts to preload', () => {
    fonts.includes('webfont.woff2').should.be.true();
    fonts.includes('unused-font.woff2').should.be.false();
    fonts.includes('not-immediately-needed.woff2').should.be.false();
    fonts.length.should.equal(1);
  });
});
