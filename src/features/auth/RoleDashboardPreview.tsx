import { useState } from 'react';
import type { OrgType } from '@mambo/contracts';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { L } from '@/i18n/labels';
import { ROLE_PREVIEW_OPTIONS, rolePreviewTabs, type DemoTab } from './rolePreviewModel';
type DemoOrder = { readonly id: number; readonly crop: string; readonly quantity: string; readonly status: string };

interface RolePreview {
  readonly title: string;
  readonly metrics: readonly { readonly label: string; readonly value: string }[];
  readonly activity: readonly string[];
}

const PREVIEWS: Record<OrgType, RolePreview> = {
  trader: {
    title: L.bootstrapTraderTitle,
    metrics: [
      { label: L.rolePreviewSpent, value: '42.800.000₫' },
      { label: L.rolePreviewReceipts, value: '18 phiếu' },
      { label: L.rolePreviewWeight, value: '1.250 kg' },
    ],
    activity: [L.rolePreviewTraderActivity1, L.rolePreviewTraderActivity2, L.rolePreviewTraderActivity3],
  },
  farmer: {
    title: L.bootstrapFarmerTitle,
    metrics: [
      { label: L.rolePreviewReceivable, value: '18.450.000₫' },
      { label: L.rolePreviewReceipts, value: '12 phiếu' },
      { label: L.rolePreviewOpenOrders, value: '2 đơn' },
    ],
    activity: [L.rolePreviewFarmerActivity1, L.rolePreviewFarmerActivity2, L.rolePreviewFarmerActivity3],
  },
  enterprise: {
    title: L.bootstrapEnterpriseTitle,
    metrics: [
      { label: L.rolePreviewBranches, value: '3 chi nhánh' },
      { label: L.rolePreviewStaff, value: '18 nhân viên' },
      { label: L.rolePreviewApprovals, value: '6 phiếu' },
    ],
    activity: [L.rolePreviewEnterpriseActivity1, L.rolePreviewEnterpriseActivity2, L.rolePreviewEnterpriseActivity3],
  },
};

const INITIAL_ORDERS: DemoOrder[] = [
  { id: 1, crop: L.rolePreviewCropRubber, quantity: '1.000 kg', status: L.rolePreviewOrderWaiting },
  { id: 2, crop: L.rolePreviewCropCashew, quantity: '500 kg', status: L.rolePreviewOrderAccepted },
];

export function RoleDashboardPreview({
  role,
  onRoleChange,
  onBack,
  backLabel = L.rolePreviewBack,
}: {
  readonly role: OrgType;
  readonly onRoleChange: (role: OrgType) => void;
  readonly onBack: () => void;
  readonly backLabel?: string;
}) {
  const preview = PREVIEWS[role];
  const [tab, setTab] = useState<DemoTab>('home');
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [receiptCount, setReceiptCount] = useState(18);
  const [connected, setConnected] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [connectionCode, setConnectionCode] = useState('K7M2-QX9P');
  const [branches, setBranches] = useState<string[]>([L.rolePreviewBranch1, L.rolePreviewBranch2, L.rolePreviewBranch3]);
  const [staffCount, setStaffCount] = useState(18);
  const [read, setRead] = useState(false);
  const [period, setPeriod] = useState('month');
  const [notice, setNotice] = useState('');

  const addOrder = () => {
    setOrders((current) => [
      { id: Date.now(), crop: L.rolePreviewCropCoffee, quantity: '300 kg', status: L.rolePreviewOrderNew },
      ...current,
    ]);
    setNotice(L.rolePreviewSampleOnly);
  };

  const updateOrder = (id: number, status: string) => {
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
    setNotice(L.rolePreviewSampleOnly);
  };

  const actionButton = (label: string, onClick: () => void) => (
    <Button tone="primary" onClick={onClick}>{label}</Button>
  );

  const content = () => {
    if (tab === 'home') {
      return (
        <>
          <section className="rounded-2xl bg-brand/5 p-4">
            <p className="text-sm font-semibold text-ink-2">{L.rolePreviewToday}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {preview.metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-rule bg-card p-4">
                  <p className="text-xs font-semibold text-ink-3">{metric.label}</p>
                  <p className="num mt-2 text-xl font-extrabold text-brand">{metric.value}</p>
                </div>
              ))}
            </div>
          </section>
          <DemoList title={L.rolePreviewRecent} items={preview.activity} />
          {role === 'farmer' && actionButton(L.rolePreviewCreateOrder, () => setTab('orders'))}
          {role !== 'farmer' && actionButton(L.rolePreviewCreateReceipt, () => setTab('book'))}
        </>
      );
    }

    if (tab === 'orders') {
      return (
        <section className="rounded-2xl border border-rule bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-ink">{L.rolePreviewNavOrders}</h2>
            {role === 'farmer' && actionButton(L.rolePreviewCreateOrder, addOrder)}
          </div>
          <div className="mt-3 divide-y divide-rule">
            {orders.map((order) => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-ink">{order.crop} · {order.quantity}</p>
                  <p className="text-sm text-ink-2">{order.status}</p>
                </div>
                {role !== 'farmer' && order.status === L.rolePreviewOrderWaiting && (
                  actionButton(L.rolePreviewOrderAccept, () => updateOrder(order.id, L.rolePreviewOrderAccepted))
                )}
                {role !== 'farmer' && order.status === L.rolePreviewOrderAccepted && (
                  actionButton(L.rolePreviewOrderSchedule, () => updateOrder(order.id, L.rolePreviewOrderScheduled))
                )}
                {order.status !== L.rolePreviewOrderCancelled && order.status !== L.rolePreviewOrderScheduled && (
                  actionButton(L.rolePreviewOrderCancel, () => updateOrder(order.id, L.rolePreviewOrderCancelled))
                )}
              </div>
            ))}
          </div>
          {notice && <p role="status" className="mt-3 text-sm text-ink-2">{notice}</p>}
        </section>
      );
    }

    if (tab === 'connections') {
      const owner = role !== 'farmer';
      return (
        <section className="rounded-2xl border border-rule bg-card p-4">
          <h2 className="font-bold text-ink">{L.rolePreviewNavConnections}</h2>
          <DemoList
            title={owner ? L.rolePreviewTraderActivity1 : L.rolePreviewFarmerActivity1}
            items={connected ? [L.rolePreviewClaimSuccess] : [L.rolePreviewPickConnection]}
          />
          {owner
            ? actionButton(L.rolePreviewInvite, () => {
                setInviteCode('K7M2-QX9P');
                setNotice(L.rolePreviewSampleOnly);
              })
            : (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="flex flex-1 flex-col gap-1 text-sm font-semibold text-ink">
                  {L.rolePreviewCode}
                  <input
                    value={connectionCode}
                    onChange={(event) => setConnectionCode(event.target.value.toUpperCase())}
                    className="min-h-11 rounded-xl border border-rule bg-card px-3 font-mono"
                  />
                </label>
                {actionButton(L.rolePreviewClaim, () => {
                  setConnected(true);
                  setNotice(L.rolePreviewSampleOnly);
                })}
              </div>
            )}
          {inviteCode && <p className="mt-3 rounded-xl bg-brand/5 p-3 font-mono font-bold text-brand">{L.rolePreviewInviteSuccess}: {inviteCode}</p>}
          {notice && <p role="status" className="mt-3 text-sm text-ink-2">{notice}</p>}
        </section>
      );
    }

    if (tab === 'book') {
      return (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-2">{L.rolePreviewSampleOnly}</p>
            {actionButton(L.rolePreviewCreateReceipt, () => {
              setReceiptCount((count) => count + 1);
              setNotice(L.rolePreviewSampleOnly);
            })}
          </div>
          <DemoList
            title={`${L.rolePreviewNavBook} · ${receiptCount} ${L.receiptsCount}`}
            items={[...preview.activity, L.rolePreviewTraderActivity1]}
          />
          {notice && <p role="status" className="text-sm text-ink-2">{notice}</p>}
        </>
      );
    }

    if (tab === 'inventory') {
      return <DemoList title={L.rolePreviewNavInventory} items={[L.rolePreviewInventoryRubber, L.rolePreviewInventoryCashew, L.rolePreviewInventoryCoffee]} />;
    }
    if (tab === 'products') {
      return <DemoList title={L.rolePreviewNavProducts} items={[L.rolePreviewProduct1, L.rolePreviewProduct2]} />;
    }
    if (tab === 'pricing') {
      return <DemoList title={L.rolePreviewNavPricing} items={[L.rolePreviewPrice1, L.rolePreviewPrice2]} />;
    }
    if (tab === 'receivables') {
      return <DemoList title={L.rolePreviewNavReceivables} items={[L.rolePreviewFarmerActivity1, L.rolePreviewFarmerActivity2]} />;
    }
    if (tab === 'debts') {
      return <DemoList title={L.rolePreviewNavDebts} items={[L.rolePreviewTraderActivity2, L.rolePreviewFarmerActivity2]} />;
    }
    if (tab === 'staff') {
      return (
        <section className="rounded-2xl border border-rule bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-ink">{L.rolePreviewNavStaff} · {staffCount}</h2>
            {actionButton(L.rolePreviewAddStaff, () => {
              setStaffCount((count) => count + 1);
              setNotice(L.rolePreviewSampleOnly);
            })}
          </div>
          <DemoList title={L.rolePreviewNavStaff} items={[L.rolePreviewStaff1, L.rolePreviewStaff2, L.rolePreviewStaff3]} />
        </section>
      );
    }
    if (tab === 'branches') {
      return (
        <section className="rounded-2xl border border-rule bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-ink">{L.rolePreviewNavBranches} · {branches.length}</h2>
            {actionButton(L.rolePreviewAddBranch, () => {
              setBranches((current) => [...current, L.rolePreviewBranchAuto(current.length + 1)]);
              setNotice(L.rolePreviewSampleOnly);
            })}
          </div>
          <DemoList title={L.rolePreviewNavBranches} items={branches} />
          <p className="text-sm text-ink-2">{L.rolePreviewBranchLimit}</p>
        </section>
      );
    }
    if (tab === 'reports') {
      return (
        <section className="rounded-2xl border border-rule bg-card p-4">
          <label className="flex items-center gap-3 text-sm font-semibold text-ink">
            {L.rolePreviewPeriod}
            <select value={period} onChange={(event) => setPeriod(event.target.value)} className="min-h-11 rounded-lg border border-rule bg-card px-3">
              <option value="month">{L.periodMonth}</option>
              <option value="year">{L.periodYear}</option>
            </select>
          </label>
          <DemoList title={L.rolePreviewNavReports} items={preview.metrics.map((metric) => `${metric.label}: ${metric.value}`)} />
        </section>
      );
    }
    if (tab === 'notifications') {
      return (
        <section className="rounded-2xl border border-rule bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-ink">{L.rolePreviewNavNotifications}</h2>
            {actionButton(read ? L.rolePreviewAllRead : L.rolePreviewMarkRead, () => setRead(true))}
          </div>
          <DemoList title={L.rolePreviewNavNotifications} items={read ? [L.rolePreviewAllRead] : preview.activity} />
        </section>
      );
    }
    return <DemoList title={L.rolePreviewNavPlans} items={role === 'enterprise' ? [L.bootstrapEnterpriseTitle, L.rolePreviewBranchLimit] : [L.bootstrapTraderBenefit3]} />;
  };

  return (
    <PageContainer width="wide">
      <div className="card p-4 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-alert">{L.rolePreviewBadge}</p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">{preview.title}</h1>
        <p className="mt-1 text-sm text-ink-2">{L.rolePreviewHint}</p>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label={L.bootstrapTitle}>
          {ROLE_PREVIEW_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              aria-pressed={role === option.type}
              onClick={() => onRoleChange(option.type)}
              className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${
                role === option.type ? 'border-brand bg-brand text-paper' : 'border-rule bg-card text-ink'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <nav aria-label={L.rolePreviewNavigation} className="mt-4 flex flex-wrap gap-2">
          {rolePreviewTabs(role).map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => { setTab(item.id); setNotice(''); }}
              className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${
                tab === item.id ? 'border-brand bg-brand text-paper' : 'border-rule bg-card text-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-5 flex flex-col gap-4">{content()}</div>
        <Button className="mt-5" block onClick={onBack}>{backLabel}</Button>
      </div>
    </PageContainer>
  );
}

function DemoList({ title, items }: { readonly title: string; readonly items: readonly string[] }) {
  return (
    <section className="rounded-2xl border border-rule bg-card p-4">
      <h2 className="font-bold text-ink">{title}</h2>
      <ul className="mt-2 divide-y divide-rule">
        {items.map((item, index) => <li key={`${item}-${index}`} className="py-3 text-sm text-ink-2">{item}</li>)}
      </ul>
    </section>
  );
}
