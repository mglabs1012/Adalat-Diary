import { dateChip, urgencyOf, type DateUrgency } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';

const TONE: Record<DateUrgency, string> = {
  today: 'bg-secondary-container text-on-secondary-container',
  overdue: 'bg-error-container text-on-error-container',
  soon: 'bg-primary-fixed text-on-primary-fixed',
  later: 'bg-surface-container text-on-surface-variant',
  none: 'bg-surface-container text-on-surface-variant',
};

/** The left-hand calendar tile on every cause-list row: 14 / OCT, stacked. */
export function DateChip({ date, className }: { date?: string | null; className?: string }) {
  const chip = dateChip(date);
  const tone = TONE[urgencyOf(date)];

  return (
    <div
      className={cn(
        'flex h-14 w-12 flex-col items-center justify-center rounded text-center',
        tone,
        className,
      )}
    >
      {chip ? (
        <>
          <span className="tnum text-headline-sm leading-none">{chip.day}</span>
          <span className="mt-0.5 text-label-sm uppercase leading-none">{chip.month}</span>
        </>
      ) : (
        <span className="text-label-sm uppercase leading-tight">No
          <br />date</span>
      )}
    </div>
  );
}
