const express = require('express');
const path = require('path');

module.exports = root => {
  const app = express();

  // Serve static assets
  app.use(express.static(root));

  // Always return the main index.html
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(root, 'index.html'));
  });

  return app;
};