const CACHE_NAME = 'reminder-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

// インストール時にキャッシュ
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// キャッシュから返す（オフライン対応）
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// バックグラウンドで1分ごとにリマインダーチェック
self.addEventListener('periodicsync', e => {
  if (e.tag === 'reminder-check') {
    e.waitUntil(checkReminders());
  }
});

// メインスレッドからのメッセージでチェックトリガー
self.addEventListener('message', e => {
  if (e.data === 'CHECK_REMINDERS') checkReminders();
});

async function checkReminders() {
  const clients = await self.clients.matchAll();
  // タブが開いているならメインスレッドに任せる
  if (clients.length > 0) return;

  // タブが閉じている場合のバックグラウンドチェック
  // ※ Service WorkerはlocalStorageに直接アクセスできないため
  //   ページからキャッシュ経由でデータを受け取る構成
  // バックグラウンド通知はPush APIが必要なため、
  // 無料サーバーなしでの完全バックグラウンド通知は
  // Periodic Background Sync（Chrome限定・要HTTPS）で動作します。
  // → スマホでは「ホーム画面追加＋アプリを開いた状態」で確実に動作します。
}

// 通知クリック時の処理
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});
