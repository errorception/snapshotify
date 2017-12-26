/* global document */

const withPage = async (page, fn) => {
  const handle = await page.evaluateHandle(fn);
  const result = await handle.jsonValue();
  await handle.dispose();
  return result;
};

module.exports.removeEmptyStyleTags = async page => withPage(page, () => {
  const styleTags = [...document.querySelectorAll('style[type="text/css"]')];
  const emptyTags = styleTags.filter(tag => !tag.innerHTML);
  emptyTags.forEach(tag => tag.parentNode.removeChild(tag));
});

module.exports.getLinksOnPage = async page => withPage(page, () => {
  return [ ...document.querySelectorAll('a') ].map(a => a.href);
});

module.exports.getMarkup = async page => withPage(page, () => {
  return '<!DOCTYPE html>' + document.documentElement.outerHTML;
});

module.exports.getStyleRules = async page => withPage(page, () => {
  const styleRules = [].concat(...[...document.styleSheets].map(stylesheet => {
    return [...stylesheet.rules].map(rule => rule.cssText);
  }));

  const cleanUpStyleRule = styleRule => {
    const [, selectorText, styleText] = styleRule.match(/(.*){(.*)}/);

    const matchedSelectors = selectorText.split(',').filter(selector => {
      if(selector.trim().startsWith('@')) return true; // @font-face, etc.
      selector = selector.replace(/::.*/i, ''); // ::after, etc.
      return !!document.querySelector(selector);
    });

    if(!matchedSelectors.length) return false;

    return `${matchedSelectors.join(', ')} { ${styleText} }`;
  };

  const mediaQueryRegex = /(@media[^{]+)\{([\s\S]+?})\s*}/i;

  return [...new Set(styleRules)].map(styleRule => {
    let mediaQueryText;

    if(styleRule.trim().startsWith('@media')) {
      [,mediaQueryText, styleRule] = styleRule.trim().match(mediaQueryRegex);

      const styleString = styleRule
        .match(/([\s\S]+?})/gi)
        .map(cleanUpStyleRule)
        .filter(x => !!x)
        .join('');

      return `${mediaQueryText} { ${styleString} }`;
    }

    return cleanUpStyleRule(styleRule);
  }).filter(x => !!x);
});

module.exports.preloadifyScripts = async page => withPage(page, () => {
  const removeScript = s => s.parentNode.removeChild(s);
  const addLinkTag = link => {
    const l = document.createElement('link');
    Object.entries(link).map(([key, value]) => l.setAttribute(key, value));
    document.head.appendChild(l);
  };

  [...document.querySelectorAll('script[src]')].forEach(script => {
    const src = script.getAttribute('src');

    if(!src.startsWith('/')) return; // TODO: Not from this domain

    addLinkTag({rel: 'preload', as: 'script', 'href': script.getAttribute('src')});
    removeScript(script); // Remove all our scripts!!!
  });
});
