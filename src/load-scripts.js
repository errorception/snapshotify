/* global document */

module.exports = () => Promise.all(
  Array.from(document.querySelectorAll('link[rel=preload][as=script]'))
    .map(l => l.getAttribute('href'))
    .map(href => new Promise(resolve => {
      const link = document.createElement('link');
      Object.entries({ rel: 'preload', as: 'script', href })
        .forEach(([attribute, value]) => link.setAttribute(attribute, value));

      link.onload = () => {
        link.parentNode.removeChild(link);
        resolve();
      };
      document.querySelector('head').appendChild(link);
    }))
);
