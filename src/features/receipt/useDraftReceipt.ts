/**
 * Trạng thái một phiếu đang cân.
 *
 * Tự lưu vào nháp sau `AUTOSAVE_MS` kể từ lần gõ cuối, nên chuyển sang khách
 * khác rồi quay lại là số vẫn còn nguyên. Nháp dùng đúng `DraftReceipt` đã có —
 * KHÔNG dựng cấu trúc dữ liệu mới cho thanh chip.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RECEIPT_LIMITS } from '@mambo/contracts';
import { AUTOSAVE_MS } from '@/config';
import { computeReceiptTotal, totalAdjustments } from '@mambo/core/calc';
import { newId } from '@mambo/core/id';
import type { DraftStatus, PaymentMethod, PriceAdjustment, Transaction, TransactionKind } from '@mambo/core/types';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { emptyLine, fromLine, isUsable, toLine, type LineDraft } from './lineDraft';
import type { PartyChoice } from './namesakes';
import {
  adjustmentsFromRules,
  receiptAdjustments,
  rulesForKind,
  useReceiptRules,
  type RuleOffer,
} from '@/data/hooks/useReceiptRules';

/** `failed`: máy không nhận bản nháp (số vượt mức máy chủ nhận) — xem `opCheck.ts`. */
export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

export interface DraftReceiptState {
  readonly draftId?: string;
  readonly kind: TransactionKind;
  /** `draft` = trên thanh "Đang cân"; `waiting` = "Để dành", chốt sau. Sửa tiếp không đổi trạng thái. */
  readonly status: DraftStatus;
  readonly counterpartyId?: string;
  readonly partyName: string;
  readonly lines: readonly LineDraft[];
  readonly adjustments: readonly PriceAdjustment[];
  /**
   * Khoản tự áp theo Quy tắc giá (kể cả theo chất lượng — V19), tính lại từ dòng mỗi lần gõ: không lưu vào nháp,
   * chỉ ghi lên phiếu lúc chốt. Xem `ruleAdjustments.ts`.
   */
  readonly ruleAdjustments: readonly PriceAdjustment[];
  /** Quy tắc chỉ cho xe đến lấy / tự mang tới — phiếu không biết nên mời thêm, không tự áp. */
  readonly offeredAdjustments: readonly RuleOffer[];
  /** Lời mời đã nhận, số tiền tính lại theo dòng; `0` = phiếu chưa đủ điều kiện của quy tắc. */
  readonly acceptedAdjustments: readonly PriceAdjustment[];
  readonly note: string;
  readonly attachmentIds: readonly string[];
  /** Phiếu lập theo đơn (BE5): đồng bộ lên thì đơn tự sang "Đã cân xong". */
  readonly orderId?: string;
  readonly linesTotal: number;
  readonly adjustmentTotal: number;
  readonly finalTotal: number;
  /**
   * Hết chỗ cho khoản mới: máy chủ nhận tối đa `RECEIPT_LIMITS.adjustments` khoản một phiếu, đếm cả khoản gõ tay, khoản
   * đã nhận từ lời mời và khoản tự áp theo quy tắc.
   */
  readonly adjustmentsFull: boolean;
  readonly canFinish: boolean;
  readonly saveState: SaveState;
  setPartyName: (name: string) => void;
  setCounterparty: (id: string | undefined, name: string) => void;
  updateLine: (id: string, patch: Partial<LineDraft>) => void;
  /** Còn thêm dòng được không — máy chủ nhận tối đa `RECEIPT_LIMITS.lines` dòng một phiếu. */
  readonly canAddLine: boolean;
  addLine: () => void;
  removeLine: (id: string) => void;
  setAdjustments: (next: readonly PriceAdjustment[]) => void;
  /** Nhận khoản mời: thành một khoản cộng / trừ thêm như gõ tay. */
  acceptOffer: (offer: RuleOffer) => void;
  setNote: (note: string) => void;
  setAttachmentIds: (ids: readonly string[]) => void;
  setOrderId: (orderId: string | undefined) => void;
  /**
   * `dueDate` chỉ có nghĩa khi phiếu còn nợ — xem `PayPartDialog`. `party`: câu trả lời khi tên gõ trùng người đã
   * có (B3, `namesakes.ts`) — không có thì core dùng lại người cùng tên như cũ. `method`: gói Pro ghi hình thức
   * của lần trả lúc chốt (V13); không có thì core tự tạo lần trả không ghi hình thức như cũ.
   */
  finish: (amountPaid: number, dueDate?: string, party?: PartyChoice, method?: PaymentMethod) => Transaction | null;
  discard: () => void;
  /** Lưu ngay thành "Để dành" và ngừng tự lưu — trang rời màn lập phiếu ngay sau đó. */
  saveForLater: () => void;
  /** Phiếu để dành quay lại thanh "Đang cân" (tự lưu như mọi lần sửa). */
  backToWeighing: () => void;
}

export function useDraftReceipt(
  draftId: string | undefined,
  kind: TransactionKind,
): DraftReceiptState {
  const { data, upsertDraft, deleteDraft, addTransaction } = useStore();
  const stored = draftId ? data.drafts.find((d) => d.id === draftId) : undefined;

  const [id, setId] = useState(draftId);
  const [partyName, setPartyName] = useState(stored?.supplierName ?? '');
  const [counterpartyId, setCounterpartyId] = useState(stored?.counterpartyId);
  const [lines, setLines] = useState<readonly LineDraft[]>(() =>
    stored && stored.lines.length > 0 ? stored.lines.map(fromLine) : [emptyLine()],
  );
  const [adjustments, setAdjustments] = useState<readonly PriceAdjustment[]>(stored?.adjustments ?? []);
  const [note, setNote] = useState(stored?.note ?? '');
  const [attachmentIds, setAttachmentIds] = useState<readonly string[]>(stored?.attachmentIds ?? []);
  const [orderId, setOrderId] = useState(stored?.orderId);
  const [status, setStatus] = useState<DraftStatus>(stored?.status ?? 'draft');
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touched = useRef(false);
  // Phiếu đã chốt thì ngừng tự lưu: nếu không, lần lưu đang chờ sẽ dựng lại
  // đúng cái nháp vừa xoá và khách đó hiện lại trên thanh "Đang cân".
  const finished = useRef(false);

  const rules = useReceiptRules();
  const usableLines = useMemo(() => lines.filter(isUsable).map(toLine), [lines]);
  const linesTotal = useMemo(() => computeReceiptTotal(usableLines).total, [usableLines]);
  const adjusted = useMemo(
    () => adjustmentsFromRules(rulesForKind(rules, kind), usableLines, adjustments),
    [rules, kind, usableLines, adjustments],
  );
  const finalAdjustments = useMemo(() => receiptAdjustments(adjusted), [adjusted]);
  const adjustmentTotal = useMemo(() => totalAdjustments(finalAdjustments), [finalAdjustments]);
  const autoCount = adjusted.applied.length;
  const canFinish = lines.some(isUsable);

  const save = (nextStatus: DraftStatus) =>
    upsertDraft({
      id,
      status: nextStatus,
      kind,
      counterpartyId,
      supplierName: partyName,
      lines: lines.map(toLine),
      amountPaid: 0,
      // Luôn gửi đủ, kể cả khi trống: gỡ hết khoản / xoá ghi chú / bỏ khách cũng phải lên máy chủ,
      // không thì lần kéo về sau dựng lại đúng cái vừa gỡ.
      adjustments: [...adjustments],
      note,
      attachmentIds: [...attachmentIds],
      orderId,
    });

  // Tự lưu nháp — người dùng không phải nhớ bấm gì trước khi chuyển khách.
  useEffect(() => {
    if (!touched.current || finished.current) return;
    setSaveState('saving');
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      try {
        setId(save(status).id);
        setSaveState('saved');
      } catch {
        setSaveState('failed');
      }
    }, AUTOSAVE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // `save` / `upsertDraft` đổi tham chiếu mỗi lần sổ đổi; đưa vào đây sẽ tự lưu vòng lặp.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, kind, status, counterpartyId, partyName, lines, adjustments, note, attachmentIds, orderId]);

  const mark = useCallback(<T,>(setter: (value: T) => void) => {
    return (value: T) => {
      touched.current = true;
      setter(value);
    };
  }, []);

  const finish = useCallback(
    (amountPaid: number, dueDate?: string, party?: PartyChoice, method?: PaymentMethod): Transaction | null => {
      // Đã chốt (hay đã xoá / cất): bấm "Trả hết" lần nữa lúc trang còn chờ chép nội dung chuyển khoản thì thôi,
      // không ghi thêm một phiếu cho cùng lô hàng.
      if (finished.current) return null;
      const usable = lines.filter(isUsable).map(toLine);
      if (usable.length === 0) return null;
      if (finalAdjustments.length > RECEIPT_LIMITS.adjustments) throw new Error(L.adjustmentsFull);

      finished.current = true;
      if (timer.current) clearTimeout(timer.current);

      const debt = linesTotal + adjustmentTotal - amountPaid;
      const picked = party && 'id' in party ? party : undefined;
      const partyId = picked ? picked.id : counterpartyId;
      const date = new Date().toISOString();
      const record = () => addTransaction({
        date,
        kind,
        counterpartyId: partyId ?? '',
        supplierId: partyId,
        supplierName: picked ? picked.name : partyName,
        lines: usable,
        amountPaid,
        payments: method && amountPaid > 0 ? [{ id: newId(), date, amount: amountPaid, method }] : [],
        adjustments: finalAdjustments.length > 0 ? finalAdjustments : undefined,
        creditTerms:
          dueDate && debt > 0
            ? [{ dueDate: new Date(dueDate).toISOString(), amount: debt }]
            : undefined,
        note: note || undefined,
        attachmentIds: attachmentIds.length > 0 ? [...attachmentIds] : undefined,
        orderId,
      }, party && 'asNew' in party ? { asNew: true } : undefined);
      let tx: Transaction;
      try {
        tx = record();
      } catch (error) {
        // Chưa chốt được thì vẫn là nháp: bật lại tự lưu, để lỗi nổi lên chỗ vừa bấm.
        finished.current = false;
        throw error;
      }

      if (id) deleteDraft(id);
      return tx;
    },
    [
      lines,
      addTransaction,
      kind,
      counterpartyId,
      partyName,
      finalAdjustments,
      adjustmentTotal,
      linesTotal,
      note,
      attachmentIds,
      orderId,
      id,
      deleteDraft,
    ],
  );

  return {
    draftId: id,
    kind,
    status,
    counterpartyId,
    partyName,
    lines,
    adjustments,
    ruleAdjustments: adjusted.applied,
    offeredAdjustments: adjusted.offered,
    acceptedAdjustments: adjusted.accepted,
    note,
    attachmentIds,
    orderId,
    linesTotal,
    adjustmentTotal,
    finalTotal: linesTotal + adjustmentTotal,
    adjustmentsFull: adjustments.length + autoCount >= RECEIPT_LIMITS.adjustments,
    canFinish,
    saveState,
    setPartyName: mark(setPartyName),
    setCounterparty: (nextId, name) => {
      touched.current = true;
      setCounterpartyId(nextId);
      setPartyName(name);
    },
    updateLine: (lineId, patch) => {
      touched.current = true;
      setLines((cur) => cur.map((l) => (l.id === lineId ? { ...l, ...patch } : l)));
    },
    canAddLine: lines.length < RECEIPT_LIMITS.lines,
    addLine: () => {
      touched.current = true;
      setLines((cur) => (cur.length >= RECEIPT_LIMITS.lines ? cur : [...cur, emptyLine()]));
    },
    removeLine: (lineId) => {
      touched.current = true;
      setLines((cur) => (cur.length === 1 ? cur : cur.filter((l) => l.id !== lineId)));
    },
    setAdjustments: mark(setAdjustments),
    // Máy chủ nhận tối đa `RECEIPT_LIMITS.adjustments` khoản một phiếu, tính cả khoản tự áp — như `adjustmentsFull`.
    acceptOffer: ({ adjustment }) => {
      touched.current = true;
      setAdjustments((cur) =>
        cur.length + autoCount >= RECEIPT_LIMITS.adjustments ? cur : [...cur, { ...adjustment, id: newId() }],
      );
    },
    setNote: mark(setNote),
    setAttachmentIds: mark(setAttachmentIds),
    setOrderId: mark(setOrderId),
    finish,
    // Như `finish`: tắt tự lưu trước, kẻo lần lưu đang chờ dựng lại đúng cái nháp vừa xoá.
    discard: () => {
      finished.current = true;
      if (timer.current) clearTimeout(timer.current);
      if (id) deleteDraft(id);
    },
    // Lưu ngay, không chờ hẹn giờ: trang chuyển khách ngay sau đó, lần lưu hẹn giờ sẽ không kịp chạy.
    saveForLater: () => {
      finished.current = true;
      if (timer.current) clearTimeout(timer.current);
      try {
        setId(save('waiting').id);
      } catch (error) {
        finished.current = false;
        throw error;
      }
      setStatus('waiting');
    },
    backToWeighing: () => {
      touched.current = true;
      setStatus('draft');
    },
  };
}
