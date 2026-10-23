import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { formatVnd, formatWeight } from '@/core/format';
import { useFarmerConnections } from '@/data/hooks/useFarmerConnections';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { useMemo } from 'react';
import { DashboardHeader } from '../dashboard/DashboardHeader';

/**
 * Phiếu cân & Công nợ — dành riêng cho tài khoản nông dân.
 *
 * Hiển thị toàn bộ phiếu từ tổ chức đang chọn với:
 *  - Tổng công nợ hai chiều (theyOwe / youOwe) cho tổ chức đó.
 *  - Danh sách phiếu có phân trang (loadMore → cursor).
 *  - Xử lý đầy đủ loading / empty / error / retry.
 *
 * KHÔNG hiện phiếu của tổ chức khác cùng lúc vì endpoint /v1/linked/receipts
 * yêu cầu orgId riêng từng lần gọi — tương tự với FarmerNetworkPage.
 */
export function FarmerWeighDebtPage() {
  const { orgType } = useStore();
  const network = useFarmerConnections();

  const balance = network.balances.find(
    (item) => item.organization.id === network.selectedOrgId,
  );

  const orgOptions = useMemo(
    () =>
      network.balances.map((item) => ({
        value: item.organization.id,
        label: item.organization.name,
      })),
    [network.balances],
  );

  if (orgType !== 'farmer') {
    return (
      <PageContainer>
        <DashboardHeader />
        <EmptyState title={L.farmerOnlyPage} />
      </PageContainer>
    );
  }

  if (!network.enabled && network.availability === 'feature-off') {
    return (
      <PageContainer>
        <DashboardHeader />
        <EmptyState
          title={L.farmerLinksFeatureOff}
          description={L.farmerLinksFeatureOffHint}
        />
      </PageContainer>
    );
  }

  if (!network.enabled) {
    return (
      <PageContainer>
        <DashboardHeader />
        <EmptyState title={L.farmerLinksPermissionOff} />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="wide">
      <DashboardHeader />
      <PageHeader title={L.farmerWeighDebtTitle} />

      {network.error && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-ink"
        >
          <span>{network.error}</span>
          <Button onClick={() => void network.retry()}>{L.dashboardRetry}</Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* ── Chọn tổ chức & tổng công nợ ── */}
        <section className="lg:col-span-12">
          {network.loading && network.balances.length === 0 ? (
            <p className="text-sm text-ink-3">{L.loading}</p>
          ) : orgOptions.length === 0 ? (
            <EmptyState
              title={L.farmerNoConnections}
              description={L.farmerClaimFirstLinkHint}
              icon="🔗"
            />
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="max-w-xs flex-1">
                <Select
                  label={L.farmerChooseOrganization}
                  value={network.selectedOrgId}
                  options={orgOptions}
                  onValueChange={network.setSelectedOrgId}
                />
              </div>
              {balance && (
                <div className="flex flex-wrap gap-6 rounded-xl bg-surface-2 px-4 py-3 text-sm">
                  <div>
                    <p className="text-xs text-ink-3">{L.farmerTheyOwe}</p>
                    <p className="num mt-1 text-lg font-extrabold text-ink">
                      {formatVnd(balance.theyOwe)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-3">{L.farmerYouOwe}</p>
                    <p className="num mt-1 text-lg font-extrabold text-ink">
                      {formatVnd(balance.youOwe)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-3">{L.receiptsCount}</p>
                    <p className="num mt-1 text-lg font-extrabold text-ink">
                      {balance.receiptCount}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Danh sách phiếu ── */}
        {orgOptions.length > 0 && (
          <div className="lg:col-span-12">
            <Card title={L.farmerLinkedReceiptsTitle} subtitle={L.farmerLinkedReceiptsHint}>
              {network.loading && network.receipts.length === 0 ? (
                <p className="text-sm text-ink-3">{L.loading}</p>
              ) : network.receipts.length === 0 && network.error ? (
                <p className="text-sm text-ink-3">{L.farmerLinkedLoadError}</p>
              ) : network.receipts.length === 0 ? (
                <EmptyState title={L.farmerNoReceipts} icon="📋" />
              ) : (
                <ul className="divide-y divide-rule">
                  {network.receipts.map((receipt) => (
                    <li key={receipt.id} className="py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-ink">
                            {receipt.kind === 'purchase'
                              ? L.farmerReceiptSale
                              : L.farmerReceiptPurchase}{' '}
                            · {receipt.partyName}
                          </p>
                          <p className="mt-1 text-xs text-ink-3">
                            {new Date(receipt.date).toLocaleString('vi-VN')} ·{' '}
                            {formatWeight(receipt.netWeight)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="num font-bold text-ink">
                            {formatVnd(receipt.total)}
                          </p>
                          <p className="num mt-1 text-xs text-ink-3">
                            {L.farmerPaid}: {formatVnd(receipt.paid)} · {L.farmerRemainingDebt}:{' '}
                            {formatVnd(receipt.debt)}
                          </p>
                        </div>
                      </div>

                      {/* Dòng hàng */}
                      {receipt.lines.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {receipt.lines.map((line, index) => (
                            <li
                              key={`${line.productName}-${index}`}
                              className="rounded-lg bg-surface-2 px-2 py-1 text-xs text-ink-2"
                            >
                              {line.productName}: {line.netWeight.toLocaleString('vi-VN')}{' '}
                              {line.unit} × {line.pricePerUnit.toLocaleString('vi-VN')}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Lịch sử trả tiền */}
                      {receipt.payments.length > 0 && (
                        <p className="mt-2 text-xs text-ink-3">
                          {L.farmerPaymentHistory}:{' '}
                          {receipt.payments
                            .map(
                              (p) =>
                                `${new Date(p.date).toLocaleDateString('vi-VN')} ${formatVnd(p.amount)}`,
                            )
                            .join(' · ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/* Load thêm phiếu qua cursor */}
              {network.cursor && (
                <div className="mt-4 flex justify-center">
                  <Button
                    disabled={network.loadingMore}
                    onClick={() => void network.loadMore()}
                  >
                    {network.loadingMore ? L.loading : L.loadMore}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
