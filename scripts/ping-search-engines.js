#!/usr/bin/env node

const https = require('https');

const BASE_URL = process.env.SITEMAP_BASE_URL || 'https://cas-porfafolio.vercel.app';
const ENV = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
const ENABLED = process.env.ENABLE_SITEMAP_PING === 'true';
const sitemapUrl = `${BASE_URL.replace(/\/$/, '')}/sitemap.xml`;

if (!ENABLED) {
  console.log('Skipping sitemap ping because ENABLE_SITEMAP_PING is not set to "true".');
  process.exit(0);
}

if (ENV !== 'production' && process.env.FORCE_PING !== 'true') {
  console.log(`Skipping sitemap ping because ENV=${ENV}. Set FORCE_PING=true to override.`);
  process.exit(0);
}

const targets = [
  `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
];

function ping(url) {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        const { statusCode } = res;
        if (statusCode && statusCode >= 200 && statusCode < 300) {
          console.log(`Pinged: ${url}`);
        } else {
          console.error(`Ping failed for ${url}: HTTP ${statusCode}`);
        }
        // Consume response data to free memory
        res.on('data', () => {});
        res.on('end', resolve);
      })
      .on('error', (err) => {
        console.error(`Ping error for ${url}:`, err.message);
        resolve();
      });
  });
}

async function run() {
  if (!BASE_URL) {
    console.error('SITEMAP_BASE_URL is required to ping search engines.');
    process.exit(1);
  }

  await Promise.all(targets.map(ping));
}

run();
