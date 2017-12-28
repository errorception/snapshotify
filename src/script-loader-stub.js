/* eslint-disable */
var link = document.querySelector("link[rel=preload][as=script][href*=main]");
if(!link) return;

var script = document.createElement('script');
script.src = link.getAttribute('href');
script.async = true;

document.querySelector('script').parentNode.appendChild(script);