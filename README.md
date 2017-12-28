snapshotify
===
[![NPM version](https://img.shields.io/npm/v/snapshotify.svg)](https://www.npmjs.com/package/snapshotify)
[![Build Status](https://travis-ci.org/errorception/snapshotify.svg?branch=master)](https://travis-ci.org/errorception/snapshotify)
[![dependencies Status](https://img.shields.io/david/errorception/snapshotify.svg)](https://david-dm.org/errorception/snapshotify)


Creates a static HTML snapshot for your [`create-react-app`](https://github.com/facebookincubator/create-react-app) app, to improve initial page load times. Makes for blazing fast load times, and improves SEO.

***Work in progress***: This module is under development. Many features that you'd need for production use aren't implemented yet. However, you are encouraged to give this module a try to get a sense of the OMG speed. Feedback and contributions welcome!

Inspired by [`react-snapshot`](https://github.com/geelen/react-snapshot) and [`react-snap`](https://github.com/stereobooster/react-snap). This module obsesses over the performance of your built app.

Usage
---
Install using npm:
```
npm install snapshotify
```

Modify the `scripts` in your package.json to add a `"postbuild"` key:
```js
{
  ...
  "scripts": {
    ...
    "postbuild": "snapshotify"
    ...
  }
}
```

Then, modify your `index.js` to wait before hydration:
```js
import React from 'react';
import { hydrate, render } from 'react-dom';
import loadScripts from 'snapshotify';
import App from './App';

const rootElement = document.getElementById('root');
if (rootElement.hasChildNodes()) {
  loadScripts().then(() => hydrate(<App />, rootElement));
} else {
  render(<App />, rootElement);
}
```

Build your app as usual:
```
npm run build
```

What it achieves
---
* Blazing fast load speed for your app.
* Better SEO, at least for crawlers that don't execute JS.


What it does
---

* Starts a temporary web server using [`express`](https://expressjs.com/) to serve your built `create-react-app` app.
* Uses [`puppeteer`](https://github.com/GoogleChrome/puppeteer) to launch a headless browser to render your app.
* Extracts the minimum CSS needed to render your app.
  - Rejects CSS rules for DOM nodes that aren't in your page.
  - Preserves rules like `@font-face`.
  - Preserves pseudo-selectors like `::before` or `:hover` for nodes that are on page.
  - Preserves media queries, but again rejects rules for DOM nodes that aren't in the page.
* Minifies the resulting minimal CSS using [`CSSO`](https://github.com/css/csso). Embeds this into the markup of your HTML directly as an inline style tag.
* Removes all external script tags (typically your `main.hash.js`), and includes them instead as `<link rel='preload' as='script' href='main.hash.js' />`.
* Adds an inline script loader to load your script files asynchronously, so that page load is not held up.
* Uses [`html-minifier`](https://github.com/kangax/html-minifier) to minify the whole resulting HTML, making several micro-optimisations.
* Recursively crawls any links you have (useful if you're using client-side routing like with [`react-router`](https://github.com/ReactTraining/react-router)), and optimises those pages too.
* Writes all the built pre-rendered html files to your build folder, ready for mounting directly to a web-server like nginx.

Configuration
---

### Specifying a config file
When invoking `snapshotify`, you can pass an additional parameter to specify your config file:
```
snapshotify --config snapshot.json
```
If you don't specify a `--config`, it defaults to `snapshot.json`. If the config file can't be found, defaults as specified below are used.

### `snapshot.json`
The config file can have any of the following properties:

* `inlineCSS`: (boolean, default `true`) Extracts the minimal CSS required for the initial render of the page, and inlines it as a style tag. You may want to disable this if the minimal CSS is already in the DOM as a style tag, which might be the case if you're using a CSS-in-JS lib that uses style tags.
* `preloadScripts`: (boolean, default `true`) Preloads your script file(s) using `<link rel='preload' as='script' href='...'>`, and injects an inline script loader to execute your code only after script preloading is complete. If your initial render depends on one or more dynamically `import`ed components, all the code-split chunks as preloaded as well. The combination of the preloading and the script loader ensures that you get to the window-onload event as soon as possible.

The following properties are mostly only useful for debugging:
* `dryRun`: (boolean, default `false`) Does a dry run. Doesn't write any files to the `build` directory. Just generates a report after processing your app.
* `printConsoleLogs`: (boolean, default `false`) Prints `console.log` lines from your app, as reported by `puppeteer`, to stdout.

Notes
---
* Works great with CSS-in-JS libs. I've tried `glamor`.
* When checking performance improvements, it's useful to use network throtting in Chrome devtools.
* It's a good idea to preload resources you are sure you will need on the page. For example, I use [`react-helmet`](https://github.com/nfl/react-helmet) to preload fonts with a `<link rel='preload' as='font' href='...' />` tag. Doesn't give you much during dev-time, but is awesome after generating the snapshot.
* Async modules loaded using dynamic `import(...)` (say through [`react-loadable`](https://github.com/thejameskyle/react-loadable)) are handled automatically. These modules are added to the page as `<link rel='preload', as='script' href='n.chunk.hash.js />`, so that they are loaded alongside your `main.js` in parallel. (Normally chunks aren't requested until after `main.js` has been downloaded and evaluated.)
* In my setup, I view the resulting snapshot app using nginx. The following is my nginx config.
  ```nginx
  server {
    listen   80;
    server_name domain.test;

    # Strip .html and trailing slash from the URL
    rewrite ^(/.*)\.html(\?.*)?$ $1$2 permanent;
    rewrite ^/(.*)/$ /$1 permanent;

    root /path/to/app/build;
    index index.html;
    try_files $uri/index.html $uri.html $uri/ $uri =404;

    gzip on;
    gzip_vary on;
    gzip_comp_level 9;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/javascript application/xml text/html;

    error_page 404 /404.html;
    error_page 500 502 503 504 /500.html;
  }

  ```
* If preloading async components for future (not immediate) use, do so after a slight delay (say 500ms), so that snapshotify doesn't see them during the build.


TODO
---
* Handling routes that can't be crawled (like stuff behind a login form). Does not make sense to snapshot these routes, but at least load the index.html correctly for the first request. This is a v1 blocker.
* Better CSP support. Inline script and style tags can't be avoided, but we can generate valid CSP hashes for them.
* Explore options to eliminate flicker with async components.
* Figure out how to play nicely with ServiceWorkers.

License: MIT