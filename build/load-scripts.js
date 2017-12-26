'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/* global document */

module.exports = function () {
  return Promise.all(Array.from(document.querySelectorAll('link[rel=preload][as=script]')).map(function (l) {
    return l.getAttribute('href');
  }).map(function (href) {
    return new Promise(function (resolve) {
      var link = document.createElement('link');
      Object.entries({ rel: 'preload', as: 'script', href: href }).forEach(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            attribute = _ref2[0],
            value = _ref2[1];

        return link.setAttribute(attribute, value);
      });

      link.onload = function () {
        link.parentNode.removeChild(link);
        resolve();
      };
      document.querySelector('head').appendChild(link);
    });
  }));
};
