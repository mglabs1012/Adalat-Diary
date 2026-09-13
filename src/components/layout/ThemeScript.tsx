/**
 * Applies the saved theme before first paint. Inlined deliberately: if this
 * ran after hydration the app would flash light before turning dark.
 */
const SCRIPT = `(function(){try{var t=localStorage.getItem('adalat-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light'}catch(_){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
