[![Build Status](https://travis-ci.org/BohemiaInteractive/bi-service-sdk-cache.svg?branch=master)](https://travis-ci.org/BohemiaInteractive/bi-service-sdk-cache)  

Provides request cache middleware for SDKs which implement `bi-service-sdk` interface.

### Integration

```javascript
const SDK = require('sdk-which-implements-bi-service-sdk-interface');
const BIServiceSDKCache = require('bi-service-sdk-cache');
const CacheStoreInterface = require('bi-cache-store-interface');

var sdk = new SDK({baseURL: '127.0.0.1'});

sdk.use(BIServiceSDKCache({
    store: memcached, //memcached must implement CacheStoreInterface (and be instanceof CacheStoreInterface)
    ttl: 10 * 60 // in seconds
}));

sdk.<requestMethod>(); //uses cache store
sdk.<requestMethod>({cache: false}); //does NOT use cache store
```
