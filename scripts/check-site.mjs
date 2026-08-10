#!/usr/bin/env node
/**
 * Kiểm `site/` trước khi xuất bản.
 *
 * Tách khỏi `check-rules.mjs` và KHÔNG nằm trong `npm run verify` vì một lý do
 * cụ thể: site còn chỗ trống chờ nhóm điền (tên chủ thể, địa chỉ, vùng máy chủ,
 * ảnh chụp màn hình), mà `verify` phải xanh suốt trong lúc làm. Cái chặn ở đây
 * là chặn **deploy**, không phải chặn commit.
 *
 * Chạy: npm run site:check
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SITE = 'site';

const violations = [];
const report = (rule, file, detail) => violations.push(`${rule}\n    ${file}  ${detail}`);

const read = (path) => readFileSync(join(ROOT, path), 'utf8');

/** Đọc hằng số từ config.ts bằng regex — script này cố ý không cần bước biên dịch. */
const configValue = (name) => {
  const source = read('src/config.ts');
  const match = new RegExp(`export const ${name} = ([^;]+);`).exec(source);
  if (!match) throw new Error(`Không thấy ${name} trong src/config.ts`);
  return match[1].trim().replace(/^'|'$/g, '');
};

const groupThousands = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const main = () => {
  const pages = readdirSync(join(ROOT, SITE)).filter((f) => f.endsWith('.html'));
  if (pages.length === 0) throw new Error('site/ chưa có trang nào');

  const priceMonthly = groupThousands(Number(configValue('PRICE_MONTHLY').replace(/_/g, '')));
  const priceYearly = groupThousands(Number(configValue('PRICE_YEARLY').replace(/_/g, '')));
  const zalo = configValue('SUPPORT_ZALO');

  for (const page of pages) {
    const path = `${SITE}/${page}`;
    const html = read(path);

    // ① Chỗ trống chưa điền. Một trang pháp lý phát hành kèm "ĐIỀN: …" là lỗi
    //    nghiêm trọng hơn nhiều so với một trang chưa đẹp.
    for (const match of html.matchAll(/ĐIỀN:[^<]*/g)) {
      report('Còn chỗ chưa điền nội dung thật', path, match[0].slice(0, 90));
    }

    // ② Không công cụ theo dõi, không tải gì từ máy chủ ngoài (G §4.2).
    if (/<script/i.test(html)) report('Site tĩnh không được có <script>', path, '');
    for (const match of html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)) {
      const url = match[1];
      if (!url.startsWith('https://app.thumua365.vn')) {
        report('Nạp tài nguyên từ máy chủ ngoài', path, url);
      }
    }

    // ③ Số Zalo phải khớp app — hai nơi ghi hai số là mất khách ngay lần đầu gọi.
    if (html.includes('Zalo') && !html.includes(zalo)) {
      report(`Số Zalo không khớp config.ts (${zalo})`, path, '');
    }

    // ④ MỌI con số tiền trên site phải là giá thật trong config.ts. Bắt cả lỗi
    //    gõ nhầm một chữ số lẫn giá cũ còn sót sau một lần đổi bảng giá — tiêu
    //    chí F §5: giá trên site và trong app phải giống nhau.
    for (const match of html.matchAll(/([\d.]+)₫/g)) {
      const figure = match[1];
      if (![priceMonthly, priceYearly, '0'].includes(figure)) {
        report(`Số tiền lạ trên site (chỉ được ${priceMonthly}₫ · ${priceYearly}₫ · 0₫)`, path, `${figure}₫`);
      }
    }
  }

  // ⑤ Trang chính phải công khai cả hai mức giá — đó là chỗ khách đi tìm.
  const index = read(`${SITE}/index.html`);
  for (const price of [priceMonthly, priceYearly]) {
    if (!index.includes(price)) {
      report(`Trang chính thiếu giá ${price}₫`, `${SITE}/index.html`, '');
    }
  }

  if (violations.length > 0) {
    console.error(`\n✗ ${violations.length} vấn đề, CHƯA xuất bản được site:\n`);
    for (const v of violations) console.error(`  ${v}\n`);
    process.exit(1);
  }
  console.error(`✓ site/ sẵn sàng xuất bản (${pages.length} trang).`);
};

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
