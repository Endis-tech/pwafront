const CACHE_NAME = 'todo-cache-v1';
const urlsToCache = [
    "/",
    "index.html",
    "/styles.css",
    "/main.js",
    "/icons/icon-192x192.png",
    "/icons/icon-152x152.png",

];

self.addEventListener('install', (event) => {
    event.waitUntill(
        caches.open(CACHE_NAME).then((cache) =>{
            return cache.addAll(urlsToCache);
        })
    );

});

self.addEventListener("activate", (event) =>{
    event.waitUntill(
        caches.keys()-then((cacheNames)=>{
            return Promise.all(
                cacheNames.map((cacheNames)=>{
                    if(cacheName !== CACHE_NAME){
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});