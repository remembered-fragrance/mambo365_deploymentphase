import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useOnceFlag } from '@/data/hooks/useOnceFlag';
import type { TransactionKind } from '@mambo/core/types';
import { L } from '@/i18n/labels';
import { coachSteps } from './coachSteps';

/**
 * Hướng dẫn bốn bước, hiện đúng MỘT lần trước phiếu đầu tiên.
 *
 * Bốn câu, mỗi câu một việc, theo đúng thứ tự các ô trên màn hình bên dưới.
 * Không có mũi tên chỉ vào từng ô: mũi tên phải bám vị trí thật của phần tử,
 * mà bố cục còn đổi theo bề rộng và theo chế độ Ngoài nắng — chỉ sai một lần
 * là hướng dẫn thành thứ gây rối.
 */
export function FirstReceiptCoach({ kind }: { readonly kind: TransactionKind }) {
  const { done, markDone } = useOnceFlag('coach-first-receipt');

  return (
    <BottomSheet open={!done} title={L.coachTitle} onClose={markDone}>
      <ol className="flex flex-col gap-3">
        {coachSteps(kind).map((step, i) => (
          <li key={step} className="flex items-start gap-3">
            <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-paper">
              {i + 1}
            </span>
            <span className="pt-1 text-base text-ink-2">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex gap-2">
        <Button block onClick={markDone}>
          {L.coachSkip}
        </Button>
        <Button tone="primary" block onClick={markDone}>
          {L.coachGotIt}
        </Button>
      </div>
    </BottomSheet>
  );
}
