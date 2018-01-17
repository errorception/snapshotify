/* global document */
const postcss = require('postcss');

const extractStyles = page => page.evaluate(() => {
  return [].concat(...[...document.styleSheets].map(stylesheet => {
    return [...stylesheet.rules].map(rule => rule.cssText);
  }));
});

const getMinimalSelectors = async (page, selectors) => {
  return page.evaluate(selectors => {
    return selectors
      //.map(s => s.replace(/::.*/i, ''))   // ::before, etc
      .filter(s => document.querySelector(s.replace(/::.*/i, '')));
  }, selectors);
};

const fontsToPreload = (usedFonts, declaredFonts) => {
  const matchingFonts = declaredFonts.filter(font => usedFonts.some(f => f.includes(font.name)));
  const woff2Fonts = matchingFonts.map(font => {
    // We're only handling woff2 fonts.
    const woff2Font = font.src.split(',').find(s => s.includes('woff2'));
    if(!woff2Font) return false;

    const match = woff2Font.match(/url\(['"]([^\)]+?\.woff2[^'"]*)/i);
    if(!match) return false;

    return match[1];
  }).filter(f => !!f);

  return [...new Set(woff2Fonts)];
};

const plugin = postcss.plugin('foo', ({ page }) => {
  const promises = [];
  const usedFonts = [];
  const declaredFonts = [];

  const makeAsync = fn => rule => promises.push(new Promise(async (resolve, reject) => {
    try { await fn(rule); resolve(); }
    catch(e) { reject(e); }
  }));

  const recordDeclaredFonts = rule => {
    const name = rule.nodes.find(n => n.prop === 'font-family').value;
    const src = rule.nodes.find(n => n.prop === 'src').value;
    declaredFonts.push({ name, src });
  };

  const recordUsedFonts = rule => {
    rule.nodes
      .filter(n => n.prop === 'font-family')
      .forEach(n => usedFonts.push(n.value));
  };

  return async css => {
    css.walkAtRules('font-face', recordDeclaredFonts);

    css.walkRules(makeAsync(async rule => {
      const minSelectors = await getMinimalSelectors(page, rule.selectors);

      if(!minSelectors.length) {
        rule.remove();
        return;
      }

      rule.selectors = minSelectors;
      recordUsedFonts(rule);
    }));

    await Promise.all(promises);
    css.usedFonts = usedFonts;
    css.declaredFonts = declaredFonts;
  };
});

module.exports = async page => {
  const result = await plugin.process(
    [...new Set(await extractStyles(page))].join('\n'),
    { from: undefined },
    { page }
  );

  return {
    css: result.css,
    fonts: fontsToPreload(result.root.usedFonts, result.root.declaredFonts)
  };
};
