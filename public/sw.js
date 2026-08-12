const CACHE_PREFIX = 'pilha-app-shell';
const CACHE_NAME = `${CACHE_PREFIX}-v2`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/pilha-icon.svg',
];

const cacheableDestinations = new Set(['font', 'image', 'script', 'style']);

function readPushPayload(event) {
  if (!event.data) {
    return {};
  }

  try {
    const value = event.data.json();

    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return { body: event.data.text() };
  }
}

function textOrFallback(value, fallback, maxLength = 180) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

function internalUrl(value) {
  try {
    const url = new URL(typeof value === 'string' ? value : '/', self.location.origin);
    return url.origin === self.location.origin ? url : new URL('/', self.location.origin);
  } catch {
    return new URL('/', self.location.origin);
  }
}

async function cacheApplicationShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);

  const response = await fetch('/index.html', { cache: 'no-store' });
  if (!response.ok) return;
  const html = await response.text();
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
  await Promise.all(assets.map(async (asset) => {
    try {
      await cache.add(asset);
    } catch {
      // O shell HTML continua disponível; o navegador poderá buscar o recurso novamente quando online.
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheApplicationShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const contentType = response.headers.get('content-type') ?? '';
          if (response.ok && contentType.includes('text/html')) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }

          return response;
        })
        .catch(async () => {
          const shell = await caches.match('/index.html');

          return (
            shell ??
            new Response('PilhA+ está temporariamente indisponível sem conexão.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }),
    );
    return;
  }

  if (!cacheableDestinations.has(request.destination)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }

        return response;
      });
    }),
  );
});

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event);
  const target = internalUrl(payload.url);
  const title = textOrFallback(payload.title, 'PilhA+', 60);
  const options = {
    body: textOrFallback(payload.body, 'Reserve um minuto para cuidar de você.'),
    icon: '/icons/pilha-icon.svg',
    badge: '/icons/pilha-icon.svg',
    tag: textOrFallback(payload.tag, 'pilha-check-in', 80),
    data: {
      url: `${target.pathname}${target.search}${target.hash}`,
      deliveryId:
        typeof payload.deliveryId === 'string' ? payload.deliveryId.slice(0, 128) : null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const target = internalUrl(event.notification.data?.url);
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if ('navigate' in client) {
          await client.navigate(target.href);
        }

        if ('focus' in client) {
          return client.focus();
        }
      }

      return self.clients.openWindow(target.href);
    })(),
  );
});
