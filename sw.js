// GitHub Pages PWA service worker. Relative URLs support project subpaths.
const VERSION = 'te-cbt-503dbd56b2';
const APP_SHELL = ['./','./index.html','./style.css','./app.js','./data.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('te-cbt-')&&key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request=event.request;
  if (request.method!=='GET' || new URL(request.url).origin!==self.location.origin) return;
  event.respondWith(caches.match(request).then(cached=>{
    if(cached) return cached;
    return fetch(request).then(response=>{
      if(response.ok && response.type==='basic') {
        const copy=response.clone();
        caches.open(VERSION).then(cache=>cache.put(request,copy)).catch(()=>{});
      }
      return response;
    });
  }));
});
