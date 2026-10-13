import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { claimErrorMessage, claimLinkCode } from '@/data/hooks/useLinked';
import { LINK_CODE_LENGTH } from '@mambo/contracts';
import { L } from '@/i18n/labels';

/**
 * Ô "Nhập mã kết nối". Nhập đúng mã vựa đưa chính là bấm đồng ý — kết nối `active` ngay.
 * Gõ kiểu gì cũng được (`k7m2-qx9p`); máy chủ chuẩn hoá và báo nếu sai hình dạng.
 */
export function ClaimCodeCard({
  onClaimed,
  initialCode = '',
}: {
  readonly onClaimed: () => void;
  /** Mã đọc từ QR (`/ket-noi?ma=…`): điền sẵn, người dùng vẫn tự bấm "Kết nối". */
  readonly initialCode?: string;
}) {
  const toast = useToast();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const compact = code.replace(/[\s-]/g, '');

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const link = await claimLinkCode(compact);
      setCode('');
      toast({ message: `${L.linkClaimed} ${link.counterpart?.name ?? ''}`.trim() });
      onClaimed();
    } catch (err) {
      setError(claimErrorMessage(err, compact));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={L.linkClaimTitle}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          label={L.partnerInviteCode}
          hint={L.linkClaimHint}
          error={error}
          value={code}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
          className="num text-lg tracking-widest uppercase"
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <Button type="submit" tone="primary" block disabled={busy || compact.length !== LINK_CODE_LENGTH}>
          {L.linkClaimButton}
        </Button>
      </form>
    </Card>
  );
}
