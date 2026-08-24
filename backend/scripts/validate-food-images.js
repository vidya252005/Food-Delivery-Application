#!/usr/bin/env node
/**
 * Validates every Unsplash photo ID used in foodImages.js returns HTTP 200.
 * Usage: node scripts/validate-food-images.js
 */
const https = require('https');
const { PHOTOS, RESTAURANT_IMAGES, CUISINE_IMAGES, getMenuItemImage } = require('./foodImages');

function check(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      res.resume();
      resolve(res.statusCode);
    }).on('error', () => resolve(0));
  });
}

async function main() {
  const urls = new Set([
    ...Object.values(PHOTOS).map((id) => `https://images.unsplash.com/photo-${id}?w=400`),
    ...Object.values(RESTAURANT_IMAGES),
    ...Object.values(CUISINE_IMAGES),
    getMenuItemImage('Test Salad', 'Salads & Bowls'),
    getMenuItemImage('Protein Chicken', 'Protein Meals'),
  ]);

  let failed = 0;
  for (const url of urls) {
    // eslint-disable-next-line no-await-in-loop
    const status = await check(url);
    if (status !== 200) {
      console.error(`FAIL ${status} ${url}`);
      failed += 1;
    }
  }
  if (failed) {
    console.error(`\n${failed} broken image URL(s)`);
    process.exit(1);
  }
  console.log(`OK — ${urls.size} image URLs verified`);
}

main();
