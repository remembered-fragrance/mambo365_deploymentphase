#!/usr/bin/env node
/**
 * Kiểm các luật của README §3 mà lint thường không diễn đạt được.
 * Mỗi luật có đúng một hàm kiểm, in ra file:dòng khi vi phạm. CI đỏ nếu có vi phạm.
 */

import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const MAX_LINES = 300;
const BANNED_FILENAMES = ['utils.ts', 'helpers.ts', 'common.ts', 'misc.ts'];

/** @returns {Promise<string[]>} đường dẫn tương đối, dùng dấu / */
const walk = async (dir) => {
  const entries = await readdir(join(ROOT, dir), { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (e) => {
      const path = `${dir}/${e.name}`;
      if (e.isDirectory()) return walk(path);
      return /\.tsx?$/.test(e.name) ? [path] : [];
    }),
  );
  return files.flat();
};

const read = (path) => readFileSync(join(ROOT, path.split('/').join(sep)), 'utf8');

const isCommentLine = (line) => /^\s*(\/\/|\/\*|\*)/.test(line);

const violations = [];
const report = (rule, path, lineNo, text) =>
  violations.push(`${rule}\n    ${path}:${lineNo}  ${text.trim().slice(0, 120)}`);

const scan = (files, rule, test, { skipComments = false } = {}) => {
  for (const path of files) {
    read(path)
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (skipComments && isCommentLine(line)) return;
        if (test(line, path)) report(rule, path, i + 1, line);
      });
  }
};

const main = async () => {
  const all = await walk('src');
  const inUi = all.filter((p) => p.startsWith('src/features/') || p.startsWith('src/components/'));
  const inCore = all.filter((p) => p.startsWith('src/core/'));

  // §3.1 — core/ không import gì ngoài chính nó (import có thể trải nhiều dòng)
  for (const path of inCore) {
    const source = read(path);
    for (const match of source.matchAll(/^\s*import\b[\s\S]*?from\s+'([^']+)';/gm)) {
      const spec = match[1] ?? '';
      if (spec.startsWith('./') || spec.startsWith('@/core/')) continue;
      const lineNo = source.slice(0, match.index).split(/\r?\n/).length;
      report('core/ chỉ được import trong chính nó', path, lineNo, `from '${spec}'`);
    }
  }

  // §3.2 — không viết chuỗi tiếng Việt thẳng vào JSX
  scan(
    inUi,
    'Chuỗi tiếng Việt trong JSX — đưa vào src/i18n/labels.ts',
    (line) => />[^<>{}]*[àáâãạảấầẩẫậắằẳẵặèéêẹẻẽếềểễệìíĩỉịòóôõọỏốồổỗộớờởỡợùúũụủứừửữựỳýỵỷỹđ]/i.test(line),
    { skipComments: true },
  );

  // §3.2 — không hardcode màu
  scan(
    inUi,
    'Màu viết cứng — chỉ dùng token trong src/index.css',
    (line) => /#[0-9a-fA-F]{3,8}\b|\b(slate|gray|zinc|neutral|stone|emerald|green|rose|amber|sky)-[0-9]{2,3}\b/.test(line),
    { skipComments: true },
  );

  // §3.7 — cấm alert/confirm/prompt toàn src/
  scan(all, 'alert/confirm/prompt — dùng <Dialog> · <ConfirmDialog> · <Toast>', (line) =>
    /(?<![\w.])(alert|confirm|prompt)\s*\(/.test(line),
  );

  // §3.7 — parse tiền chỉ qua parseNumber()
  scan(
    inUi,
    'parseFloat/Number() cho tiền — dùng parseNumber() của core/',
    (line) => /\bparseFloat\s*\(|\bNumber\s*\(/.test(line),
    { skipComments: true },
  );

  // §3.7 — localStorage/sessionStorage chỉ ở tầng data/
  scan(inUi, 'localStorage/sessionStorage ngoài data/ — đi qua useStore()', (line) =>
    /\b(localStorage|sessionStorage)\b/.test(line),
  );

  // §3.7 — cấm any
  scan(all, 'kiểu any — dùng kiểu thật hoặc unknown rồi thu hẹp', (line) =>
    /:\s*any\b|<any>|as any\b/.test(line),
  );

  // §3.3 — kích thước và tên file
  for (const path of all) {
    const lines = read(path).split(/\r?\n/).length;
    if (lines > MAX_LINES) report(`File dài ${lines} dòng (>${MAX_LINES})`, path, lines, '');
    const name = path.split('/').at(-1) ?? '';
    if (BANNED_FILENAMES.includes(name)) {
      report('Tên file không nói file làm gì', path, 1, name);
    }
  }

  if (violations.length > 0) {
    console.error(`\n✗ ${violations.length} vi phạm luật dự án:\n`);
    for (const v of violations) console.error(`  ${v}\n`);
    process.exit(1);
  }
  console.error(`✓ ${relative(ROOT, ROOT) || '.'} — không vi phạm luật dự án (${all.length} file).`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
