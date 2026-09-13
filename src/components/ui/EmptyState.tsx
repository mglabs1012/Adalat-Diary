import { ButtonLink } from './Button';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon = 'archive', title, body, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center gap-space-sm px-space-base py-space-3xl text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name={icon} size={26} />
      </span>
      <p className="font-display text-headline-sm text-primary">{title}</p>
      {body ? <p className="max-w-[38ch] text-body-sm text-on-surface-variant">{body}</p> : null}
      {actionLabel && actionHref ? (
        <ButtonLink href={actionHref} icon="add" pill className="mt-space-xs">
          {actionLabel}
        </ButtonLink>
      ) : null}
    </div>
  );
}
