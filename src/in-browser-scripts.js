/* global document */

module.exports.removeEmptyStyleTags = async page => page.evaluate(() => {
  const styleTags = [...document.querySelectorAll('style[type="text/css"]')];
  const emptyTags = styleTags.filter(tag => !tag.innerHTML);
  emptyTags.forEach(tag => tag.parentNode.removeChild(tag));
});

module.exports.getLinksOnPage = async page => page.evaluate(() => {
  return [ ...document.querySelectorAll('a') ].map(a => a.href);
});

module.exports.preloadifyScripts = async page => page.evaluate(() => {
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

module.exports.preloadifyStylesheets = async page => page.evaluate(() => {
  const stylesheets = [ ...document.querySelectorAll('link[rel=stylesheet]') ];
  stylesheets.forEach(linkTag => {
    const preloadTag = document.createElement('link');
    Object.entries({ rel: 'preload', as: 'style', href: linkTag.getAttribute('href') })
      .map(([key, value]) => preloadTag.setAttribute(key, value));

    const noscript = document.createElement('noscript');
    linkTag.parentNode.insertBefore(noscript, linkTag);
    linkTag.parentNode.removeChild(linkTag);
    noscript.appendChild(linkTag);

    // noscript.parentNode.insertBefore(preloadTag, noscript);
    document.body.appendChild(preloadTag);
  });

  return stylesheets.length;
});

module.exports.preloadifyFonts = async (page, fonts) => page.evaluate(fonts => {
  fonts.forEach(font => {
    const link = document.createElement('link');

    Object.entries({ rel: 'preload', href: font, as: 'font', type: 'font/woff2' })
      .forEach(([key, value]) => link.setAttribute(key, value));

    link.setAttribute('crossorigin', 'crossorigin');
    document.head.appendChild(link);
  });
}, fonts);