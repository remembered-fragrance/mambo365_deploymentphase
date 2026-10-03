import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { useToast } from '@/components/ui/Toast';
import { PlusIcon, ReceiptIcon, ToolIcon } from '@/components/ui/icons';
import { useDemoMode } from '@/data/hooks/useDemoMode';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { DeviceBookNotice } from '../auth/DeviceBookNotice';
import { ROUTES } from '../shared/navItems';

interface ChoiceProps {
  readonly index: string;
  readonly title: string;
  readonly hint: string;
  readonly Icon: typeof PlusIcon;
  readonly onPick: () => void;
}

/** Ba thẻ lớn — vùng chạm to, chữ to, không có gì khác trên màn để bấm nhầm. */
function Choice({ index, title, hint, Icon, onPick }: ChoiceProps) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="card flex min-h-[9rem] w-full flex-col items-start gap-2 p-5 text-left"
    >
      <span className="flex items-center gap-2 text-brand">
        <Icon className="h-7 w-7" />
        <span className="num text-lg font-extrabold">{index}</span>
      </span>
      <span className="text-lg font-bold text-ink">{title}</span>
      <span className="text-sm text-ink-2">{hint}</span>
    </button>
  );
}

/**
 * Màn hình chào khi sổ còn rỗng.
 *
 * Bản demo để người dùng mới đối diện một trang trắng với vài số 0. Với tệp
 * người dùng này thì trang trắng là điểm dừng: không biết bấm gì tiếp. Ba thẻ
 * dưới đây là ba cách vào nghề, và cách nào cũng đi tiếp được.
 */
export function WelcomeScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const { importData } = useStore();
  const { startDemo } = useDemoMode();
  const fileInput = useRef<HTMLInputElement>(null);

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    importData(JSON.parse(await file.text()) as unknown);
    toast({ message: L.importedToast });
  };

  return (
    <PageContainer width="content">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold text-ink">{L.welcomeTitle}</h1>
        <p className="mt-1 text-ink-2">{L.welcomeSubtitle}</p>
      </header>

      <div className="mb-4">
        <DeviceBookNotice />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Choice
          index="1"
          title={L.welcomeCreate}
          hint={L.welcomeCreateHint}
          Icon={PlusIcon}
          onPick={() => navigate(`${ROUTES.create}?kind=purchase`)}
        />
        <Choice
          index="2"
          title={L.welcomeDemo}
          hint={L.welcomeDemoHint}
          Icon={ReceiptIcon}
          onPick={() => {
            startDemo();
            toast({ message: L.demoStarted });
          }}
        />
        <Choice
          index="3"
          title={L.welcomeImport}
          hint={L.welcomeImportHint}
          Icon={ToolIcon}
          onPick={() => fileInput.current?.click()}
        />
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json"
        className="sr-only"
        aria-label={L.welcomeImport}
        onChange={(e) => {
          void loadFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </PageContainer>
  );
}
