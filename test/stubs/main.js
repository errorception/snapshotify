/* global window, document */
window.onload = () => {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode('test node'));
  div.setAttribute('class', 'test1 test2');
  document.body.appendChild(div);

  const a = document.createElement('a');
  a.setAttribute('href', '/test');
  document.body.appendChild(a);
};