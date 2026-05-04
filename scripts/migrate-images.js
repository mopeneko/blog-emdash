#!/usr/bin/env node
/**
 * migrate-images.js
 *
 * Converts microCMS image URLs in seed/seed.json.bak to $media format.
 * Handles three contexts:
 *   1. posts[].data.featured_image  (string URL → $media object)
 *   2. products[].data.image        (string URL → $media object)
 *   3. PT _type:"image" blocks in posts/pages content (asset.url → $media inside asset)
 *
 * Usage: node scripts/migrate-images.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.resolve(__dirname, '..', 'seed');
const INPUT_PATH = path.join(SEED_DIR, 'seed.json.bak');
const OUTPUT_PATH = path.join(SEED_DIR, 'seed.json');

const stats = {
  featuredImage: 0,
  productImage: 0,
  ptImage: 0,
  totalUniqueUrls: 0,
};

// Map<url, $media_object> so identical URLs get identical $media structures.
const mediaCache = new Map();

/** Check if a value is a microCMS image URL string. */
function isMicroCmsUrl(value) {
  return typeof value === 'string' && /^https?:\/\/images\.microcms-assets\.io\//.test(value);
}

/** Extract a sensible filename from a URL. Falls back to image-N.jpg. */
function extractFilename(urlStr, fallbackIndex) {
  try {
    const urlObj = new URL(urlStr);
    const basename = urlObj.pathname.split('/').pop() || '';
    const decoded = decodeURIComponent(basename);
    return decoded || `image-${fallbackIndex}.jpg`;
  } catch {
    return `image-${fallbackIndex}.jpg`;
  }
}

/** Get or create a $media object for the given URL. */
function getMediaObject(url, alt = '', counter) {
  if (mediaCache.has(url)) {
    return mediaCache.get(url);
  }
  const filename = extractFilename(url, counter);
  const mediaObj = {
    $media: {
      url,
      alt: alt || '',
      filename,
    },
  };
  mediaCache.set(url, mediaObj);
  return mediaObj;
}

/**
 * Walk a Portable Text array and convert _type:"image" blocks.
 * Returns a new array with converted blocks (shallow copy of unchanged blocks).
 */
function convertPtImageBlocks(blocks) {
  if (!Array.isArray(blocks)) return blocks;

  return blocks.map((block) => {
    if (
      block &&
      block._type === 'image' &&
      block.asset &&
      isMicroCmsUrl(block.asset.url)
    ) {
      stats.ptImage++;
      const alt = block.alt || '';
      return {
        ...block,
        asset: getMediaObject(block.asset.url, alt, stats.ptImage),
      };
    }
    return block;
  });
}

function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`ERROR: Input file not found: ${INPUT_PATH}`);
    console.error('Did you forget to create the backup? Run: cp seed/seed.json seed/seed.json.bak');
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT_PATH, 'utf-8');
  let seed;
  try {
    seed = JSON.parse(raw);
  } catch (err) {
    console.error('ERROR: Failed to parse seed.json.bak:', err.message);
    process.exit(1);
  }

  if (seed.content?.posts) {
    for (const post of seed.content.posts) {
      if (post.data && isMicroCmsUrl(post.data.featured_image)) {
        stats.featuredImage++;
        post.data.featured_image = getMediaObject(post.data.featured_image, '', stats.featuredImage);
      }

      if (post.data && Array.isArray(post.data.content)) {
        post.data.content = convertPtImageBlocks(post.data.content);
      }
    }
  }

  if (seed.content?.products) {
    for (const product of seed.content.products) {
      if (product.data && isMicroCmsUrl(product.data.image)) {
        stats.productImage++;
        product.data.image = getMediaObject(product.data.image, '', stats.productImage);
      }
    }
  }

  if (seed.content?.pages) {
    for (const page of seed.content.pages) {
      if (page.data && Array.isArray(page.data.content)) {
        page.data.content = convertPtImageBlocks(page.data.content);
      }
    }
  }

  stats.totalUniqueUrls = mediaCache.size;
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(seed, null, 2), 'utf-8');

  console.log('Migration complete!');
  console.log('─'.repeat(40));
  console.log(`  Featured images converted: ${stats.featuredImage}`);
  console.log(`  Product images converted:  ${stats.productImage}`);
  console.log(`  PT image blocks converted: ${stats.ptImage}`);
  console.log(`  Unique $media objects:     ${stats.totalUniqueUrls}`);
  console.log('─'.repeat(40));
  console.log(`Output: ${OUTPUT_PATH}`);
}

main();
