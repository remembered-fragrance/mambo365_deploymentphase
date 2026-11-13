import { NavLink } from 'react-router-dom';
import { PlusIcon } from '@/components/ui/icons';
import { barItem, type NavItem } from './navModel';

const filled = (items: readonly NavItem[], slots: readonly (1 | 2 | 3 | 4)[]): NavItem[] =>
  slots.map((slot) => barItem(items, slot)).filter((item): item is NavItem => item !== undefined);

const NAV_CLASS =
  'no-print fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-card pb-[env(safe-area-inset-bottom)] lg:hidden';

interface BottomNavProps {
  readonly items: readonly NavItem[];
  readonly createLabel: string;
  /** Không có ⇒ không vẽ nút tạo phiếu (vỏ không có sổ, người không được lập phiếu). */
  readonly onCreate?: () => void;
}

/**
 * Thanh dưới. Vị trí khai báo bằng `bar: 1|2|3|4`, không bằng thứ tự mảng —
 * thêm mục mới không được làm nút quen thuộc nhảy chỗ. Vai trò thiếu mục thì
 * không chừa ô trống (ô trống làm thanh lệch hẳn sang một bên):
 * - có nút tạo phiếu: nút luôn ở giữa, mỗi nửa (1·2 | 3·4) chia đều mục mình có;
 * - không có: các mục có thật chia đều cả thanh.
 */
export function BottomNav({ items, createLabel, onCreate }: BottomNavProps) {
  if (!onCreate) {
    return (
      <nav className={NAV_CLASS}>
        <div className="mx-auto flex max-w-lg items-end">
          <SlotRow items={filled(items, [1, 2, 3, 4])} />
        </div>
      </nav>
    );
  }

  return (
    <nav className={NAV_CLASS}>
      <div className="mx-auto grid max-w-lg grid-cols-[2fr_1fr_2fr] items-end">
        <div className="flex items-end">
          <SlotRow items={filled(items, [1, 2])} />
        </div>

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

        <div className="flex items-end">
          <SlotRow items={filled(items, [3, 4])} />
        </div>
      </div>
    </nav>
  );
}

function SlotRow({ items }: { readonly items: readonly NavItem[] }) {
  return (
    <>
      {items.map((item) => (
        <div key={item.id} className="min-w-0 flex-1">
          <Slot item={item} />
        </div>
      ))}
    </>
  );
}

function Slot({ item }: { readonly item: NavItem }) {
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
