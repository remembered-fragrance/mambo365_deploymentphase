import { NavLink } from 'react-router-dom';
import { PlusIcon } from '@/components/ui/icons';
import { barItem, type NavItem } from './navModel';

interface BottomNavProps {
  readonly items: readonly NavItem[];
  readonly createLabel: string;
  readonly onCreate: () => void;
}

/**
 * Thanh dưới 5 slot CỐ ĐỊNH. Vị trí khai báo bằng `bar: 1|2|3|4`, không bằng
 * thứ tự mảng — thêm mục mới không được làm nút quen thuộc nhảy chỗ.
 */
export function BottomNav({ items, createLabel, onCreate }: BottomNavProps) {
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
        <Slot item={barItem(items, 1)} />
        <Slot item={barItem(items, 2)} />

        <div className="flex justify-center pb-1">
          <button
            type="button"
            onClick={onCreate}
            aria-label={createLabel}
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-paper bg-brand text-paper shadow-lg"
          >
            <PlusIcon className="h-7 w-7" />
          </button>
        </div>

        <Slot item={barItem(items, 3)} />
        <Slot item={barItem(items, 4)} />
      </div>
    </nav>
  );
}

function Slot({ item }: { readonly item?: NavItem }) {
  if (!item) return <span />;

  const body = (
    <>
      <span className="relative">
        <item.Icon className="h-6 w-6" />
        {item.badge !== undefined && item.badge > 0 && (
          <span className="num absolute -right-2 -top-1 min-w-4 rounded-full bg-brand px-1 text-[10px] font-bold leading-4 text-paper">
            {item.badge}
          </span>
        )}
      </span>
      <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
    </>
  );

  const shape = 'flex min-h-14 flex-col items-center justify-center gap-1 px-1 pt-2';

  if (item.disabled) {
    return (
      <span aria-disabled="true" className={`${shape} text-ink-3 opacity-45`}>
        {body}
      </span>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) => `${shape} ${isActive ? 'text-brand' : 'text-ink-3'}`}
    >
      {body}
    </NavLink>
  );
}
