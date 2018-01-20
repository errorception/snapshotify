/* global document */
const Policy = require('csp-parse');
const crypto = require('crypto');

const hash = (text, algo) => `'${algo}-${crypto.createHash(algo).update(text, 'utf8').digest('base64')}'`;

module.exports = async (page, directive, contents, { addCSPHashes, cspAlgo }) => {
  if(!addCSPHashes) return;

  const policyString = await page.evaluate(() => {
    const cspMetaTag = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if(!cspMetaTag) return null;

    return cspMetaTag.getAttribute('content');
  });

  if(!policyString) return;

  const policy = new Policy(policyString);

  if(policy.get(directive).includes('\'unsafe-inline\'')) return;

  policy.add(directive, hash(contents, cspAlgo));

  await page.evaluate(policyString => {
    document
      .querySelector('meta[http-equiv="Content-Security-Policy"]')
      .setAttribute('content', policyString);
  }, policy.toString());
};