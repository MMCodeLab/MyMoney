// Service worker Portafoglio — cache-first per uso offline completo
// Alza questo numero a ogni pubblicazione: e' il cambiamento di questo file che
// fa accorgere il browser che c'e' una versione nuova, e quindi fa comparire
// l'avviso "Nuova versione disponibile" (vedi js/pwa-shell.js).
var CACHE_NAME = "mymoney-v8";
var CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./js/pwa-shell.js",
  "./js/card-brands.js",
  "./manifest.json",
  "./icons/icon-72.png",
  "./icons/icon-96.png",
  "./icons/icon-128.png",
  "./icons/icon-144.png",
  "./icons/icon-152.png",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-384.png",
  "./icons/icon-512.png"
];

// Niente skipWaiting() qui: la versione nuova resta "in attesa" finche' non e'
// l'utente a toccare "Aggiorna" nell'avviso. Il messaggio arriva da
// js/pwa-shell.js.
self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE_ASSETS);
    })
  );
});

self.addEventListener("message", function(event){
  if(event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Il filtro sul prefisso non e' un dettaglio: tutte le app della famiglia My
// stanno sullo stesso dominio (mmcodelab.github.io) e quindi condividono lo
// stesso archivio di cache. Cancellare "tutto tranne la mia", com'era prima,
// avrebbe buttato via anche le cache di MyGym, MySchool e MyVerse.
self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(name){
               return (name.indexOf("mymoney-") === 0 || name.indexOf("portafoglio-cache-") === 0)
                      && name !== CACHE_NAME;
             })
             .map(function(name){ return caches.delete(name); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// Cache-first per gli asset dell'app, con aggiornamento in background.
// Le richieste di navigazione ricadono su index.html se offline.
self.addEventListener("fetch", function(event){
  var req = event.request;
  if(req.method !== "GET") return;

  if(req.mode === "navigate"){
    event.respondWith(
      fetch(req).catch(function(){
        return caches.match("./index.html");
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function(cached){
      var networkFetch = fetch(req).then(function(res){
        if(res && res.status === 200 && res.type === "basic"){
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || networkFetch;
    })
  );
});