import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { UNDO_MS } from '@/config';

export interface ToastRequest {
  readonly message: string;
  /** Có `onUndo` thì toast hiện nút "Hoàn tác" trong `UNDO_MS`. */
  readonly onUndo?: () => void;
  readonly undoLabel?: string;
  readonly tone?: 'normal' | 'alert';
}

interface ToastState extends ToastRequest {
  readonly id: number;
}

const ToastContext = createContext<((toast: ToastRequest) => void) | null>(null);

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback(
    (request: ToastRequest) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ ...request, id: Date.now() });
      timer.current = setTimeout(() => setToast(null), UNDO_MS);
    },
    [],
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const undo = useCallback(() => {
    toast?.onUndo?.();
    clear();
  }, [toast, clear]);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed inset-x-0 bottom-24 z-50 mx-auto flex w-[min(28rem,calc(100%-2rem))] items-center gap-3 rounded-xl border border-rule bg-card px-4 py-3 shadow-lg"
        >
          <p className={`flex-1 text-sm ${toast.tone === 'alert' ? 'text-alert' : 'text-ink'}`}>
            {toast.message}
          </p>
          {toast.onUndo && toast.undoLabel && (
            <button
              type="button"
              onClick={undo}
              className="min-h-11 shrink-0 rounded-lg border border-brand px-3 text-sm font-bold text-brand"
            >
              {toast.undoLabel}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): (toast: ToastRequest) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast phải nằm trong <ToastProvider>');
  return show;
}
