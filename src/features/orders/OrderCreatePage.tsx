import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CROPS } from '@mambo/core/catalog';
import { parseNumber } from '@mambo/core/parseNumber';
import type { OrderCreateInput, OrderRole } from '@mambo/contracts';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { linkErrorMessage, useLinks } from '@/data/hooks/useLinked';
import { createOrder } from '@/data/hooks/useOrders';
import { L } from '@/i18n/labels';
import { parseMoney } from '../shared/money';
import { NumberField } from '../shared/NumberField';
import { ROUTES } from '../shared/navItems';
import { useAccess } from '../shared/useAccess';

/**
 * Tạo đơn — nông dân luôn là đơn BÁN; vựa / doanh nghiệp chọn mua hay bán.
 * Chỉ gửi được cho tổ chức đã kết nối (counterpart của kết nối `active`); sai chiều → LINK_REQUIRED.
 * Lịch lấy hàng do bên mua hẹn sau khi nhận đơn, nên ở đây không hỏi.
 */
export function OrderCreatePage() {
  const { orgType } = useAccess();
  const links = useLinks();
  const navigate = useNavigate();
  const toast = useToast();

  const [role, setRole] = useState<OrderRole>('seller');
  const [counterpartId, setCounterpartId] = useState('');
  const [crop, setCrop] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const counterparts = [
    ...new Map(
      (links.data ?? []).flatMap((l) =>
        l.status === 'active' && l.counterpart ? [[l.counterpart.id, l.counterpart.name] as const] : [],
      ),
    ),
  ];
  const target = counterpartId || counterparts[0]?.[0] || '';

  const submit = async () => {
    const estQuantity = parseNumber(quantity);
    if (!(estQuantity > 0)) {
      setError(L.orderQuantityInvalid);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const order = await createOrder({
        role: orgType === 'farmer' ? 'seller' : role,
        counterpartOrgId: target,
        crop: (crop || null) as OrderCreateInput['crop'],
        estQuantity,
        offeredPrice: price ? parseMoney(price) : null,
        note: note.trim() || null,
      });
      toast({ message: L.orderSent });
      navigate(ROUTES.orderDetail(order.id), { replace: true });
    } catch (err) {
      setError(linkErrorMessage(err));
      setBusy(false);
    }
  };

  const title = orgType === 'farmer' ? L.orderCreateSell : L.orderCreate;

  if (links.loading && !links.data) {
    return (
      <PageContainer width="content">
        <PageHeader title={title} />
        <Skeleton rows={4} label={L.loading} />
      </PageContainer>
    );
  }

  if (counterparts.length === 0) {
    return (
      <PageContainer width="content">
        <PageHeader title={title} />
        <EmptyState title={L.orderNoCounterpart} description={links.error ?? undefined} icon="🤝" />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="content">
      <PageHeader title={title} />
      <Card>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {orgType !== 'farmer' && (
            <Segmented
              label={L.orderRoleLabel}
              value={role}
              options={[
                { value: 'seller', label: L.orderRoleSeller },
                { value: 'buyer', label: L.orderRoleBuyer },
              ]}
              onValueChange={(v) => setRole(v as OrderRole)}
            />
          )}
          <Select
            label={L.orderCounterpart}
            value={target}
            options={counterparts.map(([value, label]) => ({ value, label }))}
            onValueChange={setCounterpartId}
          />
          <Select
            label={L.orderCrop}
            value={crop}
            options={[{ value: '', label: L.orderCropNone }, ...CROPS.map((c) => ({ value: c.id, label: c.label }))]}
            onValueChange={setCrop}
          />
          <NumberField label={L.orderQuantity} value={quantity} unit="kg" onValueChange={setQuantity} />
          <NumberField label={L.orderPrice} value={price} unit="₫" spoken money onValueChange={setPrice} />
          <Input label={L.orderNote} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          {error && <p className="text-sm text-alert">{error}</p>}
          <Button type="submit" tone="primary" size="lg" block disabled={busy}>
            {L.orderSend}
          </Button>
        </form>
      </Card>
    </PageContainer>
  );
}
