import puppeteer from 'puppeteer-core';
import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';

function findBrowserPath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No compatible browser executable found (checked Edge and Chrome paths).');
}

async function isPortOpen(port) {
  return new Promise(resolve => {
    const req = http.get(`http://localhost:${port}/presentation.html`, res => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startTempServer() {
  const app = express();
  app.use(express.static(path.resolve('public')));
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
    server.on('error', reject);
  });
}

async function exportPDF() {
  console.log('🔍 Locating browser executable...');
  const browserPath = findBrowserPath();
  console.log(`Found browser at: ${browserPath}`);

  let serverInstance = null;
  let targetUrl = 'http://localhost:3005/presentation.html';

  const isServerRunning = await isPortOpen(3005);
  if (!isServerRunning) {
    console.log('Starting self-contained local server for assets & presentation...');
    const { server, port } = await startTempServer();
    serverInstance = server;
    targetUrl = `http://127.0.0.1:${port}/presentation.html`;
  } else {
    console.log('Detected active server on port 3005.');
  }

  const outputPath = path.resolve('Al-Fares_Motors_Presentation.pdf');

  console.log('🚀 Launching browser in headless mode...');
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });

    console.log(`🌐 Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('⏳ Ensuring web fonts and presentation assets are loaded...');
    await page.evaluateHandle('document.fonts.ready');
    await page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        images.map(img => {
          if (img.complete) return;
          return new Promise(resolve => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', resolve);
          });
        })
      );
    });

    // Allow CSS animations and layouts to settle
    await new Promise(r => setTimeout(r, 2000));

    console.log('📄 Generating 1920x1080 presentation PDF...');
    await page.pdf({
      path: outputPath,
      width: '1920px',
      height: '1080px',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    const stats = fs.statSync(outputPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log('\n========================================');
    console.log('✅ Presentation exported successfully!');
    console.log(`📁 File: ${outputPath}`);
    console.log(`📊 Size: ${sizeMb} MB (${stats.size.toLocaleString()} bytes)`);
    console.log('========================================\n');
  } finally {
    await browser.close();
    if (serverInstance) {
      await new Promise(resolve => serverInstance.close(resolve));
      console.log('🛑 Local rendering server closed cleanly.');
    }
  }
}

exportPDF().catch(err => {
  console.error('❌ PDF export failed:', err);
  process.exit(1);
});
