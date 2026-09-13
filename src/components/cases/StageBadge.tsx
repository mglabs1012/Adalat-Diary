import { getStage, stageTone } from '@/lib/constants/stages';
import { cn } from '@/lib/utils/cn';

interface StageBadgeProps {
  stage: string;
  full?: boolean;
  className?: string;
}

/** Pill geometry, uppercase label tracking, hairline inner border. */
export function StageBadge({ stage, full, className }: StageBadgeProps) {
  const meta = getStage(stage);
  return (
    <span
      className={cn(
        'pill border border-current/15 px-2.5 py-0.5 text-label-sm uppercase',
        stageTone(stage),
        className,
      )}
    >
      {full ? meta.label : meta.short}
    </span>
  );
}
