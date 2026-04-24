#!/usr/bin/env node
import { writeFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROXY_BASE = process.env.PROXY_BASE || 'http://localhost:5000';

const SCRIPTS = ['indopak', 'tajweed'];
const CHAPTER_COUNT = 114;
const CONCURRENCY = 4;
const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 1500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function fetchOne(script, chapterId, attempt = 1) {
  const url = `${PROXY_BASE}/api/quran-text/${script}/${chapterId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.verses || !Array.isArray(data.verses) || data.verses.length === 0) {
      throw new Error(`Empty verses array`);
    }
    return data;
  } catch (err) {
    if (attempt < RETRY_LIMIT) {
      console.warn(`  retry ${attempt} for ${script}/${chapterId}: ${err.message}`);
      await sleep(RETRY_DELAY_MS * attempt);
      return fetchOne(script, chapterId, attempt + 1);
    }
    throw err;
  }
}

async function processOne(script, chapterId, force) {
  const outDir = join(ROOT, 'client', 'public', 'data', `chapters-${script}`);
  const outPath = join(outDir, `${chapterId}.json`);
  if (!force && (await fileExists(outPath))) {
    return { script, chapterId, skipped: true };
  }
  const data = await fetchOne(script, chapterId);
  await mkdir(outDir, { recursive: true });
  await writeFile(outPath, JSON.stringify(data));
  return { script, chapterId, bytes: JSON.stringify(data).length };
}

async function runScript(script, force) {
  console.log(`\n=== ${script.toUpperCase()} ===`);
  const ids = Array.from({ length: CHAPTER_COUNT }, (_, i) => i + 1);
  const results = [];
  let totalBytes = 0;
  let skipped = 0;

  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map((id) => processOne(script, id, force)),
    );
    for (const r of settled) {
      if (r.status === 'rejected') {
        console.error(`  FAILED:`, r.reason?.message || r.reason);
      } else if (r.value.skipped) {
        skipped++;
      } else {
        totalBytes += r.value.bytes;
        results.push(r.value);
      }
    }
    process.stdout.write(`  ${Math.min(i + CONCURRENCY, ids.length)}/${ids.length}\r`);
  }
  console.log(
    `  done: ${results.length} fetched, ${skipped} skipped, ${(totalBytes / 1024).toFixed(0)} KB total`,
  );
  return results.length === CHAPTER_COUNT - skipped + results.filter(() => false).length;
}

async function main() {
  const force = process.argv.includes('--force');
  console.log(`Generating bundled script data via ${PROXY_BASE}${force ? ' (force overwrite)' : ''}`);
  for (const script of SCRIPTS) {
    await runScript(script, force);
  }
  console.log('\nAll done.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
