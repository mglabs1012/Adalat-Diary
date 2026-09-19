'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';

/** A short, local guide for the add/edit form rather than an inert help glyph. */
export function CaseFormHelp() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Case form guidance"
        title="Case form guidance"
        onClick={() => setOpen(true)}
        className="press flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-primary"
      >
        <Icon name="help" size={20} />
      </button>
      <Sheet
        open={open}
        title="Adding a case"
        description="Only the court and both parties are required to create a diary entry."
        onClose={() => setOpen(false)}
      >
        <ol className="flex list-decimal flex-col gap-space-sm pl-space-lg text-body-md text-on-surface-variant">
          <li>Choose the court where the matter is listed.</li>
          <li>Enter the petitioner/plaintiff and respondent/defendant exactly as on the cause list.</li>
          <li>Add the next hearing date so the case appears on the board and diary.</li>
          <li>Open Case details only when you have supporting chamber information to keep.</li>
        </ol>
      </Sheet>
    </>
  );
}
