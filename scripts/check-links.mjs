import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const root = resolve('dist');
const base = (process.env.BASE_PATH || '/llm-lens').replace(/\/$/, '');
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
    ),
  );
  return nested.flat();
}
const htmlFiles = (await walk(root)).filter((file) => file.endsWith('.html'));
const errors = [];
let checked = 0;
for (const file of htmlFiles) {
  const source = await readFile(file, 'utf8');
  const route = file.slice(root.length).replace(/index\.html$/, '');
  const origin = `https://local.test${base}${route}`;
  for (const match of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const value = match[1].replaceAll('&amp;', '&');
    if (/^(?:https?:|data:|mailto:|tel:|\/\/)/.test(value)) continue;
    const url = new URL(value, origin);
    if (base && !url.pathname.startsWith(`${base}/`)) {
      errors.push(`${file}: outside base path: ${value}`);
      continue;
    }
    const relative = decodeURIComponent(url.pathname.slice(base.length));
    let target = resolve(root, `.${relative}`);
    if (!target.startsWith(`${root}/`) && target !== root) {
      errors.push(`${file}: invalid target ${value}`);
      continue;
    }
    try {
      if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
      await stat(target);
      if (url.hash && target.endsWith('.html')) {
        const targetHtml = await readFile(target, 'utf8');
        const fragment = decodeURIComponent(url.hash.slice(1));
        if (!targetHtml.includes(`id="${fragment}"`))
          errors.push(`${file}: missing fragment ${value}`);
      }
      checked++;
    } catch {
      errors.push(`${file}: missing target ${value}`);
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Checked ${checked} local links/assets across ${htmlFiles.length} static pages (base: ${base || '/'}).`,
  );
