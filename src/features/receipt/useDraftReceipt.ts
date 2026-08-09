/**
 * Trạng thái một phiếu đang cân.
 *
 * Tự lưu vào nháp sau `AUTOSAVE_MS` kể từ lần gõ cuối, nên chuyển sang khách
 * khác rồi quay lại là số vẫn còn nguyên. Nháp dùng đúng `DraftReceipt` đã có —
 * KHÔNG dựng cấu trúc dữ liệu mới cho thanh chip.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AUTOSAVE_MS } from '@/config';
import { computeReceiptTotal, totalAdjustments } from '@/core/calc';
import type { PriceAdjustment, Transaction, TransactionKind } from '@/core/types';
import { useStore } from '@/data/useStore';
import { emptyLine, fromLine, isUsable, toLine, type LineDraft } from './lineDraft';

export type SaveState = 'idle' | 'saving' | 'saved';

export interface DraftReceiptState {
  readonly draftId?: string;
  readonly kind: TransactionKind;
  readonly counterpartyId?: string;
  readonly partyName: string;
  readonly lines: readonly LineDraft[];
  readonly adjustments: readonly PriceAdjustment[];
  readonly note: string;
  readonly attachmentIds: readonly string[];
  readonly linesTotal: number;
  readonly adjustmentTotal: number;
  readonly finalTotal: number;
  readonly canFinish: boolean;
  readonly saveState: SaveState;
  setPartyName: (name: string) => void;
  setCounterparty: (id: string | undefined, name: string) => void;
  updateLine: (id: string, patch: Partial<LineDraft>) => void;
  addLine: () => void;
  removeLine: (id: string) => void;
  setAdjustments: (next: readonly PriceAdjustment[]) => void;
  setNote: (note: string) => void;
  setAttachmentIds: (ids: readonly string[]) => void;
  finish: (amountPaid: number) => Transaction | null;
  discard: () => void;
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
  const [adjustments, setAdjustments] = useState<readonly PriceAdjustment[]>([]);
  const [note, setNote] = useState(stored?.note ?? '');
  const [attachmentIds, setAttachmentIds] = useState<readonly string[]>(stored?.attachmentIds ?? []);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touched = useRef(false);
  // Phiếu đã chốt thì ngừng tự lưu: nếu không, lần lưu đang chờ sẽ dựng lại
  // đúng cái nháp vừa xoá và khách đó hiện lại trên thanh "Đang cân".
  const finished = useRef(false);

  const linesTotal = useMemo(
    () => computeReceiptTotal(lines.filter(isUsable).map(toLine)).total,
    [lines],
  );
  const adjustmentTotal = useMemo(() => totalAdjustments(adjustments), [adjustments]);
  const canFinish = lines.some(isUsable);

  // Tự lưu nháp — người dùng không phải nhớ bấm gì trước khi chuyển khách.
  useEffect(() => {
    if (!touched.current || finished.current) return;
    setSaveState('saving');
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      const saved = upsertDraft({
        id,
        status: 'draft',
        kind,
        counterpartyId,
        supplierName: partyName,
        lines: lines.map(toLine),
        amountPaid: 0,
        note: note || undefined,
        attachmentIds: [...attachmentIds],
      });
      setId(saved.id);
      setSaveState('saved');
    }, AUTOSAVE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // `upsertDraft` đổi tham chiếu mỗi lần sổ đổi; đưa vào đây sẽ tự lưu vòng lặp.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, kind, counterpartyId, partyName, lines, note, attachmentIds]);

  const mark = useCallback(<T,>(setter: (value: T) => void) => {
    return (value: T) => {
      touched.current = true;
      setter(value);
    };
  }, []);

  const finish = useCallback(
    (amountPaid: number): Transaction | null => {
      const usable = lines.filter(isUsable).map(toLine);
      if (usable.length === 0) return null;

      finished.current = true;
      if (timer.current) clearTimeout(timer.current);

      const tx = addTransaction({
        date: new Date().toISOString(),
        kind,
        counterpartyId: counterpartyId ?? '',
        supplierId: counterpartyId,
        supplierName: partyName,
        lines: usable,
        amountPaid,
        payments: [],
        adjustments: adjustments.length > 0 ? adjustments : undefined,
        note: note || undefined,
        attachmentIds: attachmentIds.length > 0 ? [...attachmentIds] : undefined,
      });

      if (id) deleteDraft(id);
      return tx;
    },
    [lines, addTransaction, kind, counterpartyId, partyName, adjustments, note, attachmentIds, id, deleteDraft],
  );

  return {
    draftId: id,
    kind,
    counterpartyId,
    partyName,
    lines,
    adjustments,
    note,
    attachmentIds,
    linesTotal,
    adjustmentTotal,
    finalTotal: linesTotal + adjustmentTotal,
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
    addLine: () => {
      touched.current = true;
      setLines((cur) => [...cur, emptyLine()]);
    },
    removeLine: (lineId) => {
      touched.current = true;
      setLines((cur) => (cur.length === 1 ? cur : cur.filter((l) => l.id !== lineId)));
    },
    setAdjustments: mark(setAdjustments),
    setNote: mark(setNote),
    setAttachmentIds: mark(setAttachmentIds),
    finish,
    discard: () => {
      if (id) deleteDraft(id);
    },
  };
}
