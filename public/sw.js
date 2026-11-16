// Service worker minimal : sert uniquement à rendre l'app « installable ».
// Aucun cache, aucun mode hors ligne : toutes les requêtes passent par le réseau.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* réseau uniquement */ });
