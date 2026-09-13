'use client';

/**
 * Last line of defence: the root layout itself failed, so this renders its own
 * <html>/<body> and cannot rely on the app's CSS being present.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          background: '#f8f9ff',
          color: '#0f172a',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a2b49', margin: 0 }}>
          Adalat Diary could not start
        </h1>
        <p style={{ maxWidth: 380, fontSize: 14, lineHeight: '20px', color: '#4a5160', margin: 0 }}>
          A fault stopped the app from loading. Your case records are untouched.
          {error.digest ? ` (Ref ${error.digest})` : ''}
        </p>
        <button
          onClick={reset}
          style={{
            height: 48,
            padding: '0 28px',
            borderRadius: 9999,
            border: 'none',
            background: '#1a2b49',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Reload the app
        </button>
      </body>
    </html>
  );
}
