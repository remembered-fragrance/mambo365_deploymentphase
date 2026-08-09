/**
 * Ranh giới bốn tầng — ép bằng máy, không bằng kỷ luật cá nhân.
 * Bảng gốc: deploy_plan/README.md §3.1
 *
 *   core/       nghiệp vụ thuần — không import gì ngoài chính nó
 *   data/       Supabase + cache + hàng đợi — chỉ import core/
 *   components/ UI thuần — không import core/, không import data/
 *   features/   màn hình — import core/ + components/, data/ chỉ qua useStore
 *   export/     xuất file — chạm DOM và thư viện nặng, chỉ nạp động
 *
 * `i18n/` và `config.ts` là lá dùng chung: hằng số thuần, không phụ thuộc ai.
 * Mọi tầng trừ `core/` được import chúng (core phải giữ 0 import ngoài core).
 */

const SHARED = 'src/(i18n)/|src/config\\.ts';

module.exports = {
  forbidden: [
    {
      name: 'core-phai-thuan',
      comment: 'core/ không được import React, data/, DOM hay bất kỳ thư viện ngoài nào.',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { pathNot: '^src/core/' },
    },
    {
      name: 'data-chi-import-core',
      severity: 'error',
      from: { path: '^src/data/' },
      to: { path: '^src/', pathNot: `^src/(core|data)/|^${SHARED}` },
    },
    {
      name: 'components-khong-biet-nghiep-vu',
      comment: 'components/ chỉ nhận props. Không import core/, không import data/.',
      severity: 'error',
      from: { path: '^src/components/' },
      to: { path: '^src/', pathNot: `^src/components/|^${SHARED}` },
    },
    {
      name: 'features-khong-cham-data-truc-tiep',
      comment:
        'features/ chạm tầng dữ liệu qua useStore và các hook trong data/hooks/. ' +
        'Không import client, cache, queue hay sync trực tiếp.',
      severity: 'error',
      from: { path: '^src/features/' },
      to: { path: '^src/data/', pathNot: '^src/data/(useStore\\.ts|hooks/)' },
    },
    {
      name: 'features-nap-export-dong',
      comment: 'export/ kéo theo xlsx/jspdf/html2canvas — chỉ được nạp bằng import().',
      severity: 'error',
      from: { path: '^src/features/' },
      to: { path: '^src/export/', dependencyTypesNot: ['dynamic-import'] },
    },
    {
      name: 'export-chi-import-core',
      severity: 'error',
      from: { path: '^src/export/' },
      to: { path: '^src/', pathNot: `^src/(core|export)/|^${SHARED}` },
    },
    {
      name: 'thu-vien-nang-nap-dong',
      comment: 'xlsx · jspdf · html2canvas phải nằm ngoài JS khởi tạo.',
      severity: 'error',
      from: {},
      to: {
        dependencyTypes: ['npm'],
        path: '^(xlsx|jspdf|html2canvas)',
        dependencyTypesNot: ['dynamic-import'],
      },
    },
    {
      name: 'khong-phu-thuoc-vong',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'khong-import-mo-cua',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.(css|svg|png|jpg)$' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.app.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
  },
};
