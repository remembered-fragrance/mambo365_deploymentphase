import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { CheckIcon, ChevronRightIcon } from '@/components/ui/icons';
import { L } from '@/i18n/labels';

export interface TaskLine {
  readonly id: string;
  readonly count: number;
  readonly label: string;
  readonly to: string;
}

/**
 * "Việc cần làm hôm nay" — thứ chủ vựa mở app ra để xem.
 * Việc nào cũng bấm được và dẫn thẳng tới chỗ xử lý; đếm số mà không đi tiếp
 * được thì chỉ làm người ta lo thêm.
 */
export function TodayTasks({ tasks }: { readonly tasks: readonly TaskLine[] }) {
  const pending = tasks.filter((t) => t.count > 0);

  return (
    <Card title={L.todoToday}>
      {pending.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-ink-2">
          <CheckIcon className="h-5 w-5 text-brand" />
          {L.todoNothing}
        </p>
      ) : (
        <ul className="flex flex-col">
          {pending.map((task) => (
            <li key={task.id}>
              <Link
                to={task.to}
                className="flex min-h-12 items-center gap-3 border-b border-rule py-2 last:border-b-0"
              >
                <span className="num min-w-8 text-xl font-extrabold text-brand">{task.count}</span>
                <span className="flex-1 text-sm text-ink-2">{task.label}</span>
                <ChevronRightIcon className="h-5 w-5 text-ink-3" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
