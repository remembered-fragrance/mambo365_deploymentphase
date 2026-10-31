import { useState } from 'react';
import { FEEDBACK_COMMENT_MAX } from '@mambo/contracts';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StarIcon } from '@/components/ui/icons';
import { SUPPORT_ZALO } from '@/config';
import { sendFeedback } from '@/data/hooks/useFeedback';
import { L } from '@/i18n/labels';

const STARS = [1, 2, 3, 4, 5] as const;

/** `/gop-y` — chấm 1–5 sao + góp ý tuỳ chọn, gửi thẳng lên máy chủ (G1.3). */
export function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const send = async () => {
    if (rating === 0) {
      setError(L.feedbackRatingRequired);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await sendFeedback(rating, comment);
      setSent(true);
      setRating(0);
      setComment('');
    } catch (e) {
      setError(e instanceof Error ? e.message : L.feedbackFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer width="form">
      <PageHeader title={L.navFeedback} />

      <Card>
        {sent ? (
          <div className="flex flex-col gap-3">
            <p role="status" className="rounded-xl border border-brand bg-paper p-3 text-base text-ink">
              {L.feedbackThanks}
            </p>
            <Button block onClick={() => setSent(false)}>
              {L.feedbackAgain}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-2">{L.feedbackIntro}</p>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink-2">{L.feedbackRating}</legend>
              <div className="flex gap-1">
                {STARS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} ${L.feedbackStars}`}
                    aria-pressed={n === rating}
                    onClick={() => {
                      setRating(n);
                      setError(undefined);
                    }}
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${n <= rating ? 'text-brand' : 'text-ink-3'}`}
                  >
                    <StarIcon className={`h-9 w-9 ${n <= rating ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="gop-y-noi-dung" className="text-sm font-medium text-ink-2">
                {L.feedbackComment}
              </label>
              <textarea
                id="gop-y-noi-dung"
                className="input-base min-h-28 resize-y"
                placeholder={L.feedbackCommentHint}
                value={comment}
                maxLength={FEEDBACK_COMMENT_MAX}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm font-medium text-alert">
                {error}
              </p>
            ) : null}

            <Button tone="primary" size="lg" block disabled={busy} onClick={send}>
              {busy ? L.feedbackSending : L.feedbackSend}
            </Button>
          </div>
        )}

        <p className="mt-4 text-sm text-ink-2">
          {L.feedbackOrZalo}{' '}
          <a
            href={`https://zalo.me/${SUPPORT_ZALO}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center font-semibold text-brand underline"
          >
            {L.supportZalo}: {SUPPORT_ZALO}
          </a>
        </p>
      </Card>
    </PageContainer>
  );
}
