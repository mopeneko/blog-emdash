#!/usr/bin/env node
/**
 * fix-pt-images.js
 *
 * Post-process script that fixes Portable Text image blocks in the database
 * after seed ingestion. The $media resolver in EmDash produces MediaValue
 * objects (with provider, id, meta.storageKey, etc.) inside PT _type:"image"
 * blocks, but the renderer expects asset: { _ref, url }.
 *
 * This script rewrites those blocks so images render correctly.
 *
 * Usage: node scripts/fix-pt-images.js
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '..', 'data.db');

const TABLES = ['ec_posts', 'ec_pages'];
const stats = {};

/** Check if a block is a PT image block with a local asset needing fixing. */
function needsFix(block) {
  return (
    block &&
    block._type === 'image' &&
    block.asset &&
    block.asset.provider === 'local' &&
    block.asset.id &&
    block.asset.meta?.storageKey
  );
}

/** Build the replacement asset object. */
function buildAsset(asset) {
  return {
    _ref: asset.id,
    url: `/_emdash/api/media/file/${asset.meta.storageKey}`,
  };
}

/** Walk a Portable Text array and fix image blocks in place. Returns count of fixes. */
function fixPtImageBlocks(blocks) {
  if (!Array.isArray(blocks)) return 0;
  let fixed = 0;

  for (const block of blocks) {
    if (needsFix(block)) {
      block.asset = buildAsset(block.asset);
      fixed++;
    }
  }

  return fixed;
}

function main() {
  console.log('🔧 Fixing Portable Text image blocks in database...\n');

  const db = new DatabaseSync(DB_PATH);

  let totalFixed = 0;
  let totalRows = 0;

  for (const table of TABLES) {
    const rows = db
      .prepare(`SELECT id, slug, content FROM "${table}" WHERE content LIKE '%"_type":"image"%'`)
      .all();

    stats[table] = { rows: rows.length, fixed: 0 };

    for (const row of rows) {
      let content;
      try {
        content = JSON.parse(row.content);
      } catch {
        console.warn(`  ⚠  ${table}/${row.slug}: failed to parse content JSON, skipping`);
        continue;
      }

      const fixed = fixPtImageBlocks(content);
      if (fixed > 0) {
        const updatedJson = JSON.stringify(content);
        db.prepare(`UPDATE "${table}" SET content = ? WHERE id = ?`).run(updatedJson, row.id);
        stats[table].fixed += fixed;
        totalFixed += fixed;
        totalRows++;
        console.log(`  ✓ ${table}/${row.slug}: fixed ${fixed} image block(s)`);
      }
    }
  }

  db.close();

  console.log('\n' + '─'.repeat(50));
  console.log('  Results:');
  for (const table of TABLES) {
    console.log(`    ${table}: ${stats[table].fixed} block(s) fixed across ${stats[table].rows} row(s)`);
  }
  console.log('─'.repeat(50));
  console.log(`  Total: ${totalFixed} image block(s) fixed in ${totalRows} row(s)`);
  console.log('─'.repeat(50));
}

main();
