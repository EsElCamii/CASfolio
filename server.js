const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the repo root (index.html, script.js, style.css)
const staticDir = __dirname;
app.use(express.static(staticDir, { extensions: ['html'] }));

// Fallback to index.html for any unmatched route (useful for SPA behavior)
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

