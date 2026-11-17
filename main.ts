// makefun-frontend-01 entrypoint (Node 22, standard library only).
//
// The frontend is plain static files in app/ beside this file — index.html
// plus ES modules and CSS, no build step — reading make.fun's public API.
// This program hands it in: it copies app/ and screenshots/ into the output
// directory and writes dossier.json there, the summary the judge reads
// (screenshots, first-load files and bytes, and the source), built with the
// vendored make.fun library. That library file must stay untouched: the
// scorer rebuilds the dossier with its own copy and compares byte for byte.
//
// Run it locally like this:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader the output directory is /output, taken from the environment
// when MAKEFUN_OUTPUT_DIR is set and defaulting to /output otherwise.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name) {
  const from = join(repoRoot, name);
  if (!existsSync(from)) return;
  cpSync(from, join(outDir, name), { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree('app');
copyTree('screenshots');

// The scorer's own caps: only text_max_bytes shapes the bytes written; the
// rest refuse an entry the scorer would refuse anyway (at most 3 screenshots,
// each at most 256 KiB; app/ at most 993 files and directories, 16 MiB).
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
