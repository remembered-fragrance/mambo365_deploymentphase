import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { ChevronRightIcon } from '@/components/ui/icons';
import { LEGAL_LINKS } from '@/config';
import { L } from '@/i18n/labels';

const LINKS = [
  { to: LEGAL_LINKS.terms, label: L.legalTerms },
  { to: LEGAL_LINKS.privacy, label: L.legalPrivacy },
  { to: LEGAL_LINKS.guide, label: L.legalGuide },
];

/**
 * Lối vào ba trang pháp lý & hướng dẫn. Chúng là route công khai của chính app
 * (ngoài cổng đăng nhập), nên đọc được cả khi chưa đăng nhập hay vừa xoá tài khoản.
 */
export function LegalCard() {
  return (
    <Card title={L.legalTitle}>
      <ul className="flex flex-col divide-y divide-rule">
        {LINKS.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="flex min-h-11 items-center justify-between gap-3 font-semibold text-ink">
              {link.label}
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-3" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
