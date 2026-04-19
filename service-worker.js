// Service Worker สำหรับ POS ร้านเจ้พิน
const CACHE_NAME = 'pos-jaepin-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// ตอนติดตั้ง: เก็บไฟล์หลักไว้ใน cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 กำลัง cache ไฟล์หลัก...');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// ตอนเปิดใช้งาน: ลบ cache เก่า
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ตอนโหลดไฟล์: ลอง cache ก่อน ถ้าไม่มีค่อยโหลดจากเน็ต
self.addEventListener('fetch', event => {
  // ข้าม request ที่ไปยัง Supabase API (ต้องใช้เน็ตจริงๆ)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // ถ้ามีใน cache คืนจาก cache เลย
        if (response) {
          return response;
        }
        // ถ้าไม่มี โหลดจากเน็ต แล้วเก็บเข้า cache
        return fetch(event.request).then(networkResponse => {
          // เก็บเฉพาะ response ที่สำเร็จ
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        }).catch(() => {
          // ถ้าไม่มีเน็ตและไม่มีใน cache ให้ fallback ไป index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
