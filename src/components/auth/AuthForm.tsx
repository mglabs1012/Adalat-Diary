'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api/client';
import { loginSchema, signupSchema } from '@/lib/validation/auth';
import { toast } from '@/hooks/useToast';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Field, TextInput } from '@/components/ui/Form';

type Mode = 'login' | 'signup';
type Errors = Partial<Record<'username' | 'password' | 'form', string>>;

const COPY = {
  login: {
    heading: 'Welcome back',
    sub: 'Sign in to open your diary.',
    cta: 'Sign in',
    busy: 'Signing in…',
    footer: 'New to Adalat Diary?',
    footerLink: 'Create an account',
    footerHref: '/signup',
    endpoint: '/api/auth/login',
  },
  signup: {
    heading: 'Create your chamber',
    sub: 'Pick a username and a password. That is all we ask for.',
    cta: 'Create account',
    busy: 'Creating…',
    footer: 'Already have an account?',
    footerLink: 'Sign in',
    footerHref: '/login',
    endpoint: '/api/auth/signup',
  },
} as const satisfies Record<Mode, Record<string, string>>;

/**
 * Login and signup differ only in copy and endpoint, so they share a component.
 * The surface behind it flips at `lg` — navy on a phone, the app's own surface
 * next to the brand panel on desktop — which is why the type colours are
 * responsive rather than fixed.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const params = useSearchParams();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    // Validate with the same Zod schema the server uses.
    const schema = mode === 'signup' ? signupSchema : loginSchema;
    const parsed = schema.safeParse({ username, password });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'username' || field === 'password') next[field] ??= issue.message;
      }
      setErrors(next);
      return;
    }

    setBusy(true);
    setErrors({});

    try {
      const res = await fetch(copy.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new ApiError(body?.error ?? 'Something went wrong.', res.status, body?.issues);
      }

      toast(mode === 'signup' ? 'Chamber created' : 'Signed in', 'success');

      // Full navigation, not router.push: the session cookie must reach the
      // server layout before the first authenticated screen renders.
      const next = params.get('next');
      window.location.replace(next && next.startsWith('/') ? next : '/');
    } catch (err) {
      if (err instanceof ApiError && err.issues?.length) {
        const next: Errors = {};
        for (const issue of err.issues) {
          if (issue.path === 'username' || issue.path === 'password') next[issue.path] = issue.message;
        }
        setErrors(Object.keys(next).length ? next : { form: err.message });
      } else {
        setErrors({ form: err instanceof Error ? err.message : 'Something went wrong.' });
      }
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-space-xl py-space-3xl">
      <header className="flex flex-col items-center gap-space-md text-center lg:items-start lg:text-left">
        <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 text-secondary-fixed-dim ring-1 ring-white/15 lg:hidden">
          <Icon name="scale" size={32} />
        </span>
        <div className="flex flex-col gap-space-xxs">
          <h1 className="font-display text-display-mobile text-on-primary lg:text-display-lg lg:text-primary">
            {copy.heading}
          </h1>
          <p className="text-body-md text-primary-fixed-dim lg:text-body-lg lg:text-on-surface-variant">
            {copy.sub}
          </p>
        </div>
      </header>

      {/* A raised card on navy; plain fields on the desktop surface. */}
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-space-base rounded-xl bg-surface-container-lowest p-space-lg shadow-e3 lg:bg-transparent lg:p-0 lg:shadow-none"
      >
        <Field
          label="Username"
          required
          error={errors.username}
          hint={mode === 'signup' ? 'Letters, numbers, dot, underscore or hyphen' : undefined}
        >
          {(ids) => (
            <TextInput
              ids={ids}
              leading="person"
              name="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrors((s) => ({ ...s, username: undefined, form: undefined }));
              }}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              placeholder="adv.garvit"
            />
          )}
        </Field>

        <Field
          label="Password"
          required
          error={errors.password}
          hint={mode === 'signup' ? 'At least 8 characters' : undefined}
        >
          {(ids) => (
            <div className="relative">
              <TextInput
                ids={ids}
                leading="lock"
                name="password"
                type={reveal ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((s) => ({ ...s, password: undefined, form: undefined }));
                }}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                enterKeyHint="go"
                placeholder="••••••••"
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
              >
                <Icon name={reveal ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
          )}
        </Field>

        {errors.form ? (
          <p
            role="alert"
            className="flex items-start gap-space-xs rounded bg-error-container px-space-md py-space-sm text-body-sm text-on-error-container"
          >
            <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
            {errors.form}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          block
          pill
          loading={busy}
          icon={mode === 'signup' ? 'add' : undefined}
          className="mt-space-xs"
        >
          {busy ? copy.busy : copy.cta}
        </Button>
      </form>

      <p className="text-center text-body-md text-primary-fixed-dim lg:text-left lg:text-on-surface-variant">
        {copy.footer}{' '}
        <Link
          href={copy.footerHref}
          className="font-semibold text-secondary-fixed-dim underline-offset-4 hover:underline lg:text-secondary"
        >
          {copy.footerLink}
        </Link>
      </p>
    </div>
  );
}
