// build/tools/gen_thumbs.js
const fs    = require('fs').promises;
const path  = require('path');
const sharp = require('sharp');

// Configure persistent storage paths
const persistPath = process.env.PERSIST_PATH || path.resolve(__dirname, '../..');  // Fallback for local dev
const IMG_DIR   = path.join(persistPath, 'img');
const THUMB_DIR = path.join(persistPath, 'thumbs');
const SIZE      = 96;            // px

(async () => {
  await fs.mkdir(THUMB_DIR, {recursive: true});
  const files = await fs.readdir(IMG_DIR);

  let created = 0;
  for (const f of files) {
    // Skip non-image files and Zone.Identifier files
    if (f.includes('Zone.Identifier') || f.includes('.attrs')) {
      continue;
    }

    const src = path.join(IMG_DIR, f);
    const dst = path.join(THUMB_DIR, f);
    try {
      await fs.access(dst);          // exists → skip
      process.stdout.write('s');     // skipped (thumbnail exists)
    } catch (_) {
      try {
        // Get file stats to ensure it's a regular file
        const stats = await fs.stat(src);
        if (!stats.isFile()) {
          continue; // Skip directories or special files
        }

        await sharp(src).resize(SIZE, SIZE, {fit:'inside'}).toFile(dst);
        created++;
        process.stdout.write('.');   // progress dot
      } catch (err) {
        // Skip files that cause errors (e.g., non-image files)
        process.stdout.write('e');   // error indicator
        console.error(`\nError processing ${f}: ${err.message}`);
      }
    }
  }
  console.log(`\n${created} thumbnails created (out of ${files.length} files).`);
})().catch(e => { console.error(e); process.exit(1); });