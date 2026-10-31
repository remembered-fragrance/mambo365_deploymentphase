import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { LEGAL_LINKS, SUPPORT_ZALO } from '@/config';
import { L } from '@/i18n/labels';
import { GUIDE } from '@/i18n/legal/guide';
import type { LegalBlock, LegalDoc } from '@/i18n/legal/legalDoc';
import { PRIVACY } from '@/i18n/legal/privacy';
import { TERMS } from '@/i18n/legal/terms';

export type LegalKind = keyof typeof LEGAL_LINKS;

const DOCS: Readonly<Record<LegalKind, LegalDoc>> = { terms: TERMS, privacy: PRIVACY, guide: GUIDE };
const TITLES: Readonly<Record<LegalKind, string>> = {
  terms: L.legalTerms,
  privacy: L.legalPrivacy,
  guide: L.legalGuide,
};

function Block({ block }: { readonly block: LegalBlock }) {
  switch (block.kind) {
    case 'p':
      return <p className="leading-relaxed">{block.text}</p>;
    case 'note':
      return <p className="rounded-xl border border-rule bg-paper p-3 font-semibold leading-relaxed">{block.text}</p>;
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className={`flex flex-col gap-1.5 pl-5 leading-relaxed ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </Tag>
      );
    }
    case 'table': {
      const hasHead = block.head.some((h) => h !== '');
      return (
        <div className="overflow-x-auto rounded-xl border border-rule">
          <table className="w-full text-left text-sm">
            {hasHead && (
              <thead className="bg-paper text-ink-2">
                <tr>
                  {block.head.map((h) => (
                    <th key={h} scope="col" className="p-2.5 font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-rule">
              {block.rows.map((row) => (
                <tr key={row.join('|')} className="align-top">
                  {row.map((cell, i) => (
                    <td key={i} className={`p-2.5 ${i === 0 ? 'font-semibold text-ink' : ''}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
}

/**
 * Điều khoản · Quyền riêng tư · Hướng dẫn — route công khai, nằm NGOÀI cổng đăng
 * nhập và ngoài khung app: đọc được khi chưa đăng nhập (ô đồng ý lúc đăng ký mở
 * tab mới tới đây), khi vừa xoá tài khoản, hay khi người ngoài được gửi link.
 */
export function LegalPage({ kind }: { readonly kind: LegalKind }) {
  const doc = DOCS[kind];
  const others = (Object.keys(DOCS) as LegalKind[]).filter((k) => k !== kind);

  // Bấm sang trang pháp lý khác ở chân trang: bắt đầu đọc từ đầu, không giữ chỗ cuộn cũ.
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [kind]);

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-10 border-b border-rule bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <span className="flex items-center gap-2 text-base font-extrabold text-brand">
            <Logo className="h-7 w-7" />
            {L.appName}
          </span>
          <Link to="/" className="inline-flex min-h-11 items-center font-semibold text-brand underline">
            {L.legalBackToApp}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 text-ink-2">
        <h1 className="text-2xl font-extrabold text-ink">{doc.title}</h1>
        {doc.meta && <p className="mt-1 text-sm text-ink-3">{doc.meta}</p>}
        <p className="mt-3 leading-relaxed">{doc.intro}</p>

        <nav aria-label={L.legalContents} className="card mt-5 p-4">
          <p className="text-sm font-bold text-ink">{L.legalContents}</p>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="inline-flex min-h-9 items-center text-brand underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {doc.sections.map((s) => (
          <section key={s.id} id={s.id} className="mt-7 scroll-mt-20">
            <h2 className="mb-3 text-lg font-extrabold text-ink">{s.title}</h2>
            <div className="flex flex-col gap-3">
              {s.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </div>
          </section>
        ))}

        <footer className="mt-10 border-t border-rule pt-4 text-sm">
          <p className="font-bold text-ink">{L.legalOtherPages}</p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            {others.map((k) => (
              <li key={k}>
                <Link to={LEGAL_LINKS[k]} className="inline-flex min-h-11 items-center text-brand underline">
                  {TITLES[k]}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-ink-3">
            {L.legalSupportZalo}: {SUPPORT_ZALO}
          </p>
        </footer>
      </main>
    </div>
  );
}
