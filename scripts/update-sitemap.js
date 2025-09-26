#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sitemapPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');

const BASE_URL = process.env.SITEMAP_BASE_URL || 'https://casfolio.vercel.app';
const ROUTES = (process.env.SITEMAP_ROUTES || '/').split(',').map(route => route.trim()).filter(Boolean);
const CHANGEFREQ = process.env.SITEMAP_CHANGEFREQ || 'weekly';

const formatDate = (date) => date.toISOString().split('T')[0];

function buildUrlEntry(route) {
  const url = route === '/' ? BASE_URL : (route.startsWith('http://') || route.startsWith('https://')
    ? route
    : new URL(route.startsWith('/') ? route : `/${route}`, `${BASE_URL}/`).toString());

  const priority = route === '/' ? '1.0' : '0.8';

  return `  <url>\n    <loc>${url}</loc>\n    <lastmod>${formatDate(new Date())}</lastmod>\n    <changefreq>${CHANGEFREQ}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function generateSitemap() {
  if (!BASE_URL) {
    console.error('SITEMAP_BASE_URL is required to generate a sitemap.');
    process.exit(1);
  }

  const urls = ROUTES.length > 0 ? ROUTES : ['/'];
  const entries = urls.map(buildUrlEntry).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;

  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`Sitemap written to ${sitemapPath}`);
}

generateSitemap();
