import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell, AppTopbar } from '@/components/layout/AppShell';
import { BottomNav } from '@/components/layout/BottomNav';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { OfflineBanner, SyncBadge, type SyncTone } from '@/components/feedback/SyncBadge';
import { MoonIcon, SearchIcon, SunIcon } from '@/components/ui/icons';
import { overdueCount } from '@/core/debtSelectors';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { PlanBanner } from '../billing/PlanBanner';
import { DemoBanner } from '../onboarding/DemoBanner';
import { CommandPalette } from '../search/CommandPalette';
import { useBookRescue } from './bookFile';
import { navGroups, navItems, ROUTES } from './navItems';
import { useTheme } from './useTheme';

const SYNC_LABEL: Record<SyncTone, string> = {
  synced: L.syncSynced,
  pending: L.syncPending,
  offline: L.syncOffline,
  error: L.syncError,
};

const syncTone = (pendingCount: number, error?: string): SyncTone => {
  if (error) return 'error';
  if (pendingCount > 0) return 'pending';
  return 'synced';
};

const PAGE_TITLE: Record<string, string> = {
  [ROUTES.dashboard]: L.navDashboard,
  [ROUTES.receipts]: L.navReceipts,
  [ROUTES.create]: L.createReceipt,
  [ROUTES.debts]: L.navDebts,
  [ROUTES.inventory]: L.navInventory,
  [ROUTES.suppliers]: L.navSuppliers,
  [ROUTES.buyers]: L.navBuyers,
  [ROUTES.products]: L.navProducts,
  [ROUTES.pricing]: L.navPricing,
  [ROUTES.reports]: L.taxReport,
  [ROUTES.utilities]: L.navUtilities,
  [ROUTES.profile]: L.navProfile,
  [ROUTES.more]: L.navMore,
};

export function AppLayout({ children }: { readonly children: ReactNode }) {
  const { data, status } = useStore();
  const { theme, cycleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const drafts = data.drafts.filter((d) => d.status === 'draft');
  const counts = { drafts: drafts.length, overdue: overdueCount(data) };
  const items = navItems(counts);
  const tone = syncTone(status.pendingCount, status.error);

  useBookRescue(data);

  // Ctrl/⌘ K — phím tắt duy nhất của app. Người dùng máy tính mong có nó,
  // người dùng điện thoại có nút kính lúp ngay trên header.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const startReceipt = useCallback(
    (kind: 'purchase' | 'sale') => {
      setCreateOpen(false);
      navigate(`${ROUTES.create}?kind=${kind}`);
    },
    [navigate],
  );

  const themeToggle = (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`${L.themeSwitch}: ${theme === 'sun' ? L.themeSun : theme === 'night' ? L.themeNight : L.themeDay}`}
      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-2"
    >
      {theme === 'night' ? <MoonIcon /> : <SunIcon />}
    </button>
  );

  const searchButton = (
    <button
      type="button"
      onClick={() => setSearchOpen(true)}
      aria-label={`${L.searchTitle} (${L.searchShortcut})`}
      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-2"
    >
      <SearchIcon />
    </button>
  );

  const badge = <SyncBadge tone={tone} label={SYNC_LABEL[tone]} />;

  return (
    <>
      <AppShell
        sidebar={
          <SidebarNav
            appName={L.appName}
            groups={navGroups(counts)}
            primaryActions={
              <>
                <Button tone="primary" block onClick={() => startReceipt('purchase')}>
                  {L.createPurchase}
                </Button>
                <Button block onClick={() => startReceipt('sale')}>
                  {L.createSale}
                </Button>
              </>
            }
            footer={badge}
          />
        }
        topbar={
          <AppTopbar
            actions={
              <>
                {searchButton}
                {themeToggle}
              </>
            }
            syncBadge={badge}
          />
        }
        mobileHeader={
          <MobileHeader
            title={PAGE_TITLE[pathname] ?? L.appName}
            themeToggle={themeToggle}
            actions={searchButton}
            syncBadge={badge}
          />
        }
        banner={
          <>
            <DemoBanner />
            <PlanBanner />
            {status.error &&
              (status.blocked ? (
                // Hết gói không phải mất mạng. Nói nhầm thì người dùng đi tìm
                // sóng trong khi thứ cần làm là mở lại gói.
                <OfflineBanner message={L.syncBlocked} detail={L.syncBlockedDetail} />
              ) : (
                <OfflineBanner message={L.syncOfflineBanner} detail={L.syncOfflineDetail} />
              ))}
          </>
        }
        bottomNav={
          <BottomNav
            items={items}
            createLabel={L.createReceipt}
            onCreate={() => setCreateOpen(true)}
          />
        }
      >
        {children}
      </AppShell>

      <BottomSheet open={createOpen} title={L.createReceipt} onClose={() => setCreateOpen(false)}>
        <div className="flex flex-col gap-2">
          {drafts.map((draft) => (
            <Button
              key={draft.id}
              block
              onClick={() => {
                setCreateOpen(false);
                navigate(`${ROUTES.create}?draft=${draft.id}`);
              }}
            >
              {draft.supplierName || L.walkIn}
            </Button>
          ))}
          <Button tone="primary" block onClick={() => startReceipt('purchase')}>
            {L.createPurchase}
          </Button>
          <Button block onClick={() => startReceipt('sale')}>
            {L.createSale}
          </Button>
        </div>
      </BottomSheet>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
