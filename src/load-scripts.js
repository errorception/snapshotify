/* global document */
const isPreloadSupported = () => {
  // Based on https://gist.github.com/yoavweiss/b1f798bb2be4e671107b
  try {
    return document.createElement('link').relList.supports('preload');
  } catch(e) {
    return false;
  }
}

module.exports = () => !isPreloadSupported() ? Promise.resolve() : Promise.all(
  Array.from(document.querySelectorAll('link[rel=preload][as=script]'))
    .map(l => l.getAttribute('href'))
    .map(href => new Promise(resolve => {
      const link = document.createElement('link');
      link.addEventListener('load', () => {
        console.log('loaded');
        link.parentNode.removeChild(link);
        resolve();
      });
      link.addEventListener('error', (e) => {
        console.log('error', e);
        link.parentNode.removeChild(link);
        resolve();
      });

      Object.entries({ rel: 'preload', as: 'script', href })
        .forEach(([attribute, value]) => link.setAttribute(attribute, value));

      document.querySelector('head').appendChild(link);
      console.log('appended');
    }))
);
