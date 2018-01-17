const csso = require('csso');
const { promisify } = require('util');
const { readFile } = require('fs');
const { join } = require('path');
const { minify } = require('html-minifier');
const delay = require('delay2');
const getMinimalCss = require('./min-css');
const {
  getLinksOnPage, removeEmptyStyleTags, getMarkup,
  preloadifyScripts, preloadifyStylesheets, preloadifyFonts
} = require('./in-browser-scripts');

const [scriptLoader, stylesheetLoader] = [
  'script-loader-stub.js',
  'style-loader-stub.js'
].map(f => promisify(readFile)(join(__dirname, f)));

const minifierOptions = {
  minifyJS: true,
  collapseWhitespace: true,
  collapseBooleanAttributes: true,
  removeAttributeQuotes: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttribute: true,
  removeStyleLinkTypeAttributes: true,
  sortAttributes: true
};

const wrapScripts = str => `window.addEventListener('load', function(){${str}});`;

const injectLoaderScript = async (page, scriptsToInsert) => page.addScriptTag({
  content: wrapScripts((await Promise.all(scriptsToInsert)).join('\n'))
});

module.exports = async ({ browser, path, config }) => {
  const page = await browser.newPage();

  await page.goto(path);
  await delay(50);

  if(config.printConsoleLogs) {
    page.on('console', msg => {
      for (let i = 0; i < msg.args.length; ++i) {
        console.log(`[browser-console] - ${path} - ${i}: ${msg.args[i]}`);
      }
    });
  }

  const scriptsToInsert = [];

  if(config.inlineCSS || config.preloadFonts) {
    const { css, fonts } = await getMinimalCss(page);

    if(config.inlineCSS) {
      const minimalStyles = csso.minify(css).css;
      await page.addStyleTag({ content: minimalStyles });

      const stylesheetCount = await preloadifyStylesheets(page);
      if(stylesheetCount) scriptsToInsert.push(stylesheetLoader);
    }

    if(config.preloadFonts) {
      await preloadifyFonts(page, fonts);
    }
  }


  if(config.preloadScripts) {
    await preloadifyScripts(page);
    scriptsToInsert.push(scriptLoader);
  }

  if(scriptsToInsert.length) {
    await injectLoaderScript(page, scriptsToInsert);
  }

  await removeEmptyStyleTags(page);

  const [ markup, links ] = await Promise.all([
    minify(await getMarkup(page), minifierOptions),
    getLinksOnPage(page)
  ]);

  await page.close();

  return { markup, links };
};
