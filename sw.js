/* Cube Coach offline worker: the app opens from this phone's copy, even with no signal, and quietly fetches a newer version for next time. */
const CACHE = 'cube-coach';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
async function refresh(c, req, key, oldCopy, page) { // oldCopy: a clone taken before the cached page was handed to the browser
  try {
    const res = await fetch(page ? req.url : req, { cache: 'no-cache' }); if (!res.ok) return null; // a page request cannot be re-sent with options, so ask by address
    const body = await res.clone().text(), old = oldCopy ? await oldCopy.text() : null;
    await c.put(key, res.clone());
    if (page && old !== null && old !== body) (await self.clients.matchAll()).forEach(x => x.postMessage('updated'));
    return res;
  } catch (e) { return null; }
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const page = req.mode === 'navigate', key = page ? './index.html' : req;
  e.respondWith((async () => {
    const c = await caches.open(CACHE), hit = await c.match(key, { ignoreSearch: true }), net = refresh(c, req, key, hit ? hit.clone() : null, page);
    e.waitUntil(net);
    return hit || (await net) || Response.error();
  })());
});
