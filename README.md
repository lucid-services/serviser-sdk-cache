[![Build Status](https://travis-ci.org/lucid-services/serviser-sdk-cache.svg?branch=master)](https://travis-ci.org/lucid-services/serviser-sdk-cache)  

Provides request cache middleware for SDKs which implement `serviser-sdk` interface.

### Integration

```javascript
const SDK = require('sdk-which-implements-serviser-sdk-interface');
const ServiceSDKCache = require('serviser-sdk-cache');
const CacheStoreInterface = require('serviser-cache-store-interface');

var sdk = new SDK({baseURL: '127.0.0.1'});

sdk.use(ServiceSDKCache({
    store: memcached, //memcached must implement CacheStoreInterface (and be instanceof CacheStoreInterface)
    ttl: 10 * 60 // in seconds
}));

sdk.<requestMethod>(); //uses cache store
sdk.<requestMethod>({cache: false}); //does NOT use cache store
```
