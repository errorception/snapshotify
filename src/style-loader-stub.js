/* eslint-disable */
var links = document.querySelectorAll("link[rel=preload][as=style]");
for(var i=0; i<links.length; i++) {
  links[i].setAttribute('rel', 'stylesheet');
}
