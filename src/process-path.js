const csso = require('csso');
const { promisify } = require('util');
const { readFile } = require('fs');
const { join } = require('path');
const { minify } = require('html-minifier');
const {
  getLinksOnPage, preloadifyScripts, getStyleRules,
  getMarkup, removeEmptyStyleTags
} = require('./in-browser-scripts');

const scriptLoader = promisify(readFile)(join(__dirname, 'script-loader-stub.js'));

const injectScriptLoader = async page => page.addScriptTag({
  content: (await scriptLoader).toString('utf8')
});

module.exports = async ({ browser, path }) => {
  const page = await browser.newPage();

  await page.goto(path);

  page.on('console', msg => {
    for (let i = 0; i < msg.args.length; ++i) {
      console.log(`${i}: ${msg.args[i]}`);
    }
  });

  const rulesToInline = [ ...new Set(await getStyleRules(page)) ];
  const minimalStyles = csso.minify(rulesToInline.join('')).css;
  await page.addStyleTag({ content: minimalStyles });

  await preloadifyScripts(page);
  await injectScriptLoader(page);

  await removeEmptyStyleTags(page);

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

  const [ markup, links ] = await Promise.all([
    minify(await getMarkup(page), minifierOptions),
    getLinksOnPage(page)
  ]);

  await page.close();

  return { markup, links };
};
