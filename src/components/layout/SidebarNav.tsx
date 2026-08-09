import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { NavGroup } from './navModel';

interface SidebarNavProps {
  readonly groups: readonly NavGroup[];
  readonly appName: string;
  /** Hai nút Mua / Bán — việc người dùng làm nhiều nhất, nằm trên cùng. */
  readonly primaryActions: ReactNode;
  readonly footer?: ReactNode;
}

export function SidebarNav({ groups, appName, primaryActions, footer }: SidebarNavProps) {
  return (
    <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-rule bg-card lg:flex">
      <div className="px-4 py-5">
        <p className="text-lg font-extrabold tracking-tight text-brand">{appName}</p>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-4">{primaryActions}</div>

      <nav className="flex-1 overflow-y-auto px-3">
        {groups.map((group) => (
          <div key={group.id} className="mb-4">
            <p className="px-2 pb-1 text-xs font-bold uppercase tracking-wide text-ink-3">
              {group.label}
            </p>
            <ul>
              {group.items.map((item) => (
                <li key={item.id}>
                  {item.disabled ? (
                    <span
                      aria-disabled="true"
                      className="flex min-h-11 items-center gap-2.5 rounded-lg px-2 text-sm font-medium text-ink-3 opacity-45"
                    >
                      <item.Icon className="h-5 w-5" />
                      {item.label}
                    </span>
                  ) : (
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        `flex min-h-11 items-center gap-2.5 rounded-lg px-2 text-sm font-medium ${
                          isActive ? 'bg-paper text-brand' : 'text-ink-2'
                        }`
                      }
                    >
                      <item.Icon className="h-5 w-5" />
                      {item.label}
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="num ml-auto rounded-full bg-paper px-2 text-xs font-bold text-ink-2">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {footer && <div className="border-t border-rule p-3">{footer}</div>}
    </aside>
  );
}
