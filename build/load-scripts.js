'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/* global document */
var isPreloadSupported = function isPreloadSupported() {
  // Based on https://gist.github.com/yoavweiss/b1f798bb2be4e671107b
  try {
    return document.createElement('link').relList.supports('preload');
  } catch (e) {
    return false;
  }
};

module.exports = function () {
  return !isPreloadSupported() ? Promise.resolve() : Promise.all(Array.from(document.querySelectorAll('link[rel=preload][as=script]')).map(function (l) {
    return l.getAttribute('href');
  }).map(function (href) {
    return new Promise(function (resolve) {
      var link = document.createElement('link');
      var completed = function completed() {
        link.parentNode.removeChild(link);
        resolve();
      };

      link.addEventListener('load', completed);
      link.addEventListener('error', completed);

      Object.entries({ rel: 'preload', as: 'script', href: href }).forEach(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            attribute = _ref2[0],
            value = _ref2[1];

        return link.setAttribute(attribute, value);
      });

      document.querySelector('head').appendChild(link);
    });
  }));
};
