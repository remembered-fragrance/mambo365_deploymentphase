import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { TrashIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/core/format';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';

/** Ghi chú: giá thoả thuận, số xe, lời hẹn — thứ hay quên nhất. */
export function NotesCard() {
  const { data, addNote, updateNote, deleteNote } = useStore();
  const toast = useToast();
  const [body, setBody] = useState('');

  const notes = [...data.notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const submit = () => {
    if (!body.trim()) return;
    addNote(body);
    setBody('');
  };

  const remove = (id: string, text: string) => {
    deleteNote(id);
    toast({ message: `${L.del}: ${text.slice(0, 30)}`, tone: 'alert' });
  };

  return (
    <Card title={L.notesTitle}>
      <div className="mb-3 flex items-end gap-2">
        <div className="flex-1">
          <Input
            label={L.noteBody}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </div>
        <Button tone="primary" onClick={submit}>
          {L.add}
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-ink-3">{L.noNotesHint}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border border-rule bg-paper p-3">
              <p className={`text-sm ${note.done ? 'text-ink-3 line-through' : 'text-ink'}`}>
                {note.body}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="num text-ink-3">{formatDate(note.createdAt)}</span>
                <label className="flex min-h-11 items-center gap-1.5 text-ink-2">
                  <input
                    type="checkbox"
                    checked={note.pinned}
                    onChange={(e) => updateNote(note.id, { pinned: e.target.checked })}
                    className="h-5 w-5 accent-[var(--color-brand)]"
                  />
                  {L.notePin}
                </label>
                <label className="flex min-h-11 items-center gap-1.5 text-ink-2">
                  <input
                    type="checkbox"
                    checked={note.done}
                    onChange={(e) => updateNote(note.id, { done: e.target.checked })}
                    className="h-5 w-5 accent-[var(--color-brand)]"
                  />
                  {L.noteDone}
                </label>
                <button
                  type="button"
                  aria-label={`${L.del}: ${note.body.slice(0, 20)}`}
                  onClick={() => remove(note.id, note.body)}
                  className="ml-auto flex min-h-11 min-w-11 items-center justify-center rounded-lg text-alert"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
