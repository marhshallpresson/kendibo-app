const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
const distPath = path.join(__dirname, 'dist');

if (!fs.existsSync(distPath)) {
  console.warn(`WARNING: The dist folder was not found at ${distPath}. Did you run the build step?`);
}

// Serve static files from the React web build
app.use(express.static(distPath));

// For any other route, serve index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Kendibo App Web UI serving on port ${PORT}`);
});
