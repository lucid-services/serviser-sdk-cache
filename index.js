var BIServiceSDK = require('bi-service-sdk');
var CacheStoreInterface = require('bi-cache-store-interface');


module.exports = BIServiceSDKCachePlugin;

/**
 * @param {Object} options
 * @param {CacheStoreInterface} store - memcached | redis | couchbase etc...
 * @param {Integer} ttl
 *
 * @return {Function}
 */
function BIServiceSDKCachePlugin(options) {

    options = options || {};
    var store = options.store;

    if (!(store instanceof CacheStoreInterface)) {
        throw new Error('`options.store` must implement `CacheStoreInterface`');
    }

    return function initializer(axios) {
        var _adapter = axios.defaults.adapter;

        axios.defaults.adapter = function cacheAdapter(config) {
            //fallback to the original adapter if the request is not GET
            if (   !config
                || config.cache === false
                || typeof config.method !== 'string'
                || config.method.toLowerCase() !== 'get'
            ) {
                return _adapter(config);
            }

            return store.get('todo-key').catch(CacheStoreInterface.NotFoundError, function(err) {
                return _adapter(config);
            }).then(function(response) {
                return store.set('toto-key', response).return(response);
            });
        };
    };
}
