export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener(
    'load',
    () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        // A aplicação continua funcional mesmo quando o navegador bloqueia o PWA.
      });
    },
    { once: true },
  );
}
