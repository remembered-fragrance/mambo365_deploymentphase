import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { partySummaries } from '@mambo/core/partySelectors';
import { Card } from '@/components/ui/Card';
import { formatLinkCode, useLinks } from '@/data/hooks/useLinked';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { linkStateOf } from '../partners/linkState';
import { ROUTES } from '../shared/navItems';

/** Mã đang chờ hiện sẵn trên Tổng quan — đủ để đọc cho người đứng trước mặt, không phải mở danh bạ. */
const SHOWN = 3;

/**
 * Mã kết nối cho nông hộ, đặt ngay trên Tổng quan: nông hộ nhập mã ở app của họ để tự xem phiếu
 * cân và tiền còn nợ. Mỗi nông hộ một mã (FRONTEND §5.6) — lấy mã ở cột Kết nối của danh sách Nông hộ.
 */
export function LinkCodesCard() {
  const { data } = useStore();
  const links = useLinks();
  const suppliers = useMemo(() => partySummaries(data, 'supplier').filter((p) => p.hasProfile), [data]);

  const states = suppliers.map((p) => ({ party: p, state: linkStateOf(links.data ?? [], p.id) }));
  const linked = states.filter((s) => s.state.kind === 'linked').length;
  const pending = states.flatMap((s) => (s.state.kind === 'pending' ? [{ name: s.party.name, code: s.state.code.code }] : []));
  const none = states.length - linked - pending.length;

  if (suppliers.length === 0 || (links.loading && !links.data)) return null;

  return (
    <Card title={L.linkCodesTitle} subtitle={L.linkCodesHint}>
      <p className="num text-sm text-ink-2">
        {linked} {L.linkCodesLinked} · {pending.length} {L.linkCodesPending} · {none} {L.linkCodesNotInvited}
      </p>
      {pending.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {pending.slice(0, SHOWN).map((p) => (
            <li key={p.code} className="flex items-center justify-between gap-3">
              <span className="truncate font-semibold text-ink">{p.name}</span>
              <span className="num select-all text-lg font-extrabold tracking-widest text-ink">{formatLinkCode(p.code)}</span>
            </li>
          ))}
        </ul>
      )}
      {links.error && <p className="mt-2 text-sm text-alert">{links.error}</p>}
      <Link to={ROUTES.suppliers} className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand underline">
        {L.linkCodesOpen}
      </Link>
    </Card>
  );
}
