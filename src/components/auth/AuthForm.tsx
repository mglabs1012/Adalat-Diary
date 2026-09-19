'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api/client';
import { checkLogin, checkSignup, normaliseUsername } from '@/lib/validation/credentials';
import { toast } from '@/hooks/useToast';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Checkbox, Field, TextInput } from '@/components/ui/Form';

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
 *
 * The panel behind this form is a fixed deep navy in both themes, so the type
 * and field colours are pinned rather than taken from the theme tokens —
 * otherwise dark mode inverts the panel and the form separately and you get
 * light text on a light ground.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const params = useSearchParams();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    // The same rules the server enforces, minus the validation library —
    // see lib/validation/credentials. The server remains authoritative.
    const found = mode === 'signup' ? checkSignup(username, password) : checkLogin(username, password);
    if (found.username || found.password) {
      setErrors(found);
      return;
    }
    const credentials = { username: normaliseUsername(username), password, remember };

    setBusy(true);
    setErrors({});

    try {
      const res = await fetch(copy.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
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
      <header className="flex flex-col gap-space-lg">
        {/* The brand mark only appears here when the left panel is gone. */}
        <div className="flex items-center gap-space-sm lg:hidden">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-white/10 text-secondary-fixed-dim ring-1 ring-white/15">
            <Icon name="scale" size={24} />
          </span>
          <span className="font-display text-headline-sm text-[#eef1f9]">Adalat Diary</span>
        </div>

        <div className="flex flex-col gap-space-xs">
          <h1 className="font-display text-display-mobile leading-tight text-[#eef1f9] lg:text-display-lg">
            {copy.heading}
          </h1>
          <p className="text-body-lg text-[#b3bccd]">{copy.sub}</p>
        </div>
      </header>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-space-base">
        <Field
          label="Username"
          required
          error={errors.username}
          hint={mode === 'signup' ? 'Letters, numbers, dot, underscore or hyphen' : undefined}
          tone="onDark"
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
              placeholder="john.doe"
              className="field-dark"
              iconClassName="text-[#8e99ad]"
            />
          )}
        </Field>

        <Field
          label="Password"
          required
          error={errors.password}
          hint={mode === 'signup' ? 'At least 8 characters' : undefined}
          tone="onDark"
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
                className="field-dark pr-12"
                iconClassName="text-[#8e99ad]"
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#8e99ad] transition-colors hover:bg-white/10 hover:text-[#eef1f9]"
              >
                <Icon name={reveal ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
          )}
        </Field>

        <Checkbox
          tone="onDark"
          checked={remember}
          onChange={setRemember}
          label="Keep me signed in"
          hint={
            remember
              ? 'This device stays signed in for 90 days'
              : 'You will be signed out when you close the browser'
          }
        />

        {errors.form ? (
          <p
            role="alert"
            className="flex items-start gap-space-sm rounded bg-[#93000a] px-space-md py-space-sm text-body-sm text-[#ffdad6]"
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
          className="mt-space-xs bg-primary-fixed-dim text-on-primary-fixed hover:bg-primary-fixed"
        >
          {busy ? copy.busy : copy.cta}
        </Button>
      </form>

      <p className="text-body-md text-[#b3bccd]">
        {copy.footer}{' '}
        <Link
          href={copy.footerHref}
          className="font-semibold text-secondary-fixed-dim underline-offset-4 hover:underline"
        >
          {copy.footerLink}
        </Link>
      </p>
    </div>
  );
}
