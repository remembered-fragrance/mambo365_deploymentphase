import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { todayRange, useMemberActivity } from '@/data/hooks/useOrg';
import { L } from '@/i18n/labels';
import { ROUTES } from '../shared/navItems';

/** Ai làm gì hôm nay — chỉ chủ (`staff:manage`). Chi tiết theo tháng ở màn Nhân viên. */
export function StaffTodayCard() {
  const { from, to } = todayRange();
  const report = useMemberActivity(from, to);
  if (!report.data) return null;

  const staff = report.data.members.filter((a) => a.member.role !== 'owner' && a.member.status === 'active');
  const receipts = (a: (typeof staff)[number]) => a.receipts.purchase.count + a.receipts.sale.count;
  const total = staff.reduce((sum, a) => sum + receipts(a), 0);

  return (
    <Card title={L.staffToday}>
      {staff.length === 0 ? (
        <p className="text-sm text-ink-2">{L.staffNoneYet}</p>
      ) : (
        <>
          <p className="num text-sm text-ink-2">
            {staff.length} {L.membersPeople} · {total} {L.staffTodayHint}
          </p>
          <ul className="mt-3 flex flex-col gap-1">
            {staff.map((a) => (
              <li key={a.member.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-ink">{a.member.name ?? '—'}</span>
                <span className="num text-ink-2">
                  {receipts(a)} {L.receiptsCount}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <Link to={ROUTES.members} className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand underline">
        {L.staffManage}
      </Link>
    </Card>
  );
}
