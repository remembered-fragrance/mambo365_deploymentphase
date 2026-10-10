import { Card } from '@/components/ui/Card';
import { ChevronRightIcon } from '@/components/ui/icons';
import { LEGAL_LINKS } from '@/config';
import { L } from '@/i18n/labels';

const LINKS = [
  { href: LEGAL_LINKS.terms, label: L.legalTerms },
  { href: LEGAL_LINKS.privacy, label: L.legalPrivacy },
  { href: LEGAL_LINKS.guide, label: L.legalGuide },
];

/**
 * Liên kết ra site tĩnh.
 *
 * Mở tab mới chứ không nhúng trong app: hai trang pháp lý phải đọc được kể cả
 * khi người ta chưa đăng nhập, chưa cài app, hoặc vừa xoá tài khoản xong —
 * chúng thuộc về site công khai, không thuộc về app.
 */
export function LegalCard() {
  return (
    <Card title={L.legalTitle}>
      <ul className="flex flex-col divide-y divide-rule">
        {LINKS.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center justify-between gap-3 font-semibold text-ink"
            >
              {link.label}
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-3" />
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
