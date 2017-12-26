snapshotify
===

Creates a static HTML snapshot for your `create-react-app` app, to improve initial page load times. Makes for blazing fast initial page load times, and improves SEO.

***Work in progress***: This module is still being developed. Many features that you'd need for production use aren't implemented yet. However, you are encouraged to give this module a try and give feedback!

Inspired by `react-snapshot` and `react-snap`. While these projects are awesome for creating snapshots, this module obsesses about the performance of your built app.

Usage
---
Install using npm:
```
npm install snapshotify
```

Modify the `scripts` in your package.json to add a `postbuild` key:
```json
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
import loadScripts from 'snapshotify';
// ...

const root = document.getElementById('root');
if (root.hasChildNodes()) {
  loadScripts().then(() => hydrate(<App />, root));
} else {
  render(<App />, root);
}

```

When you're done, build your app as usual:
```
npm run build
```

What it achieves
---
* Blazing fast load speed for your app.
* Better SEO, at least for crawlers that don't execute JS.


How it works
---

* Starts a temporary web server to serve your built create-react-app app.
* Uses `puppeteer` to launch a headless browser to load your app in Chromium.
* Extracts the minimum CSS needed to render your app. Embeds this into the markup of your HTML directly as an inline style tag, after minifying it further with `CSSO`.
* Removes all external script tags (typically your `main.hash.js`), and includes them instead as `<link rel='preload' as='script' href='main.hash.js' />`.
* Adds an inline script loader to load your script files asynchronously, so that page load is not held up.
* Uses `html-minifier` to minify the whole HTML, making several micro-optimisations.
* Recursively crawls any links you have (useful if you're using client-side routing like with `react-router`), and optimises those pages too.
* Writes all the built html files to your build folder, ready for mounting directly to a web-server like nginx.

Notes
---
* Works great with CSS-in-JS libs. I've tried `glamor`.
* When checking performance improvements, it's useful to use network throtting in Chrome devtools.
* It's a good idea to preload resources you are sure you will need on the page. For example, I use react-helmet to preload fonts with a `<link rel='preload' as='font' href='...' />` tag. Doesn't give you much during dev-time, but is awesome after snapshotting.
* Async modules (using say `react-loadable`) are handled automatically. These modules are added to the page as `<link rel='preload', as='script' href='n.chunk.hash.js />`, so that they are loaded alongside your main.js. (Normally chunks aren't loaded until after main.js has been downloaded and evaluated.)
* In my setup, I view the resulting snapshotted app using nginx. The following is my nginx config
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
* Currently, files are crawled sequentially. Parallelise for speed.

License: MIT