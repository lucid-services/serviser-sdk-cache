var hash                = require('object-hash');
var CacheStoreInterface = require('bi-cache-store-interface');


module.exports = BIServiceSDKCachePlugin;

/**
 * @param {Object} options
 * @param {CacheStoreInterface} options.store - memcached | redis | couchbase etc...
 * @param {Integer} [options.ttl=5min] - in seconds (0 = unlimited)
 *
 * @return {Function}
 */
function BIServiceSDKCachePlugin(options) {

    options = Object.assign({}, options || {});
    var store = options.store;

    if (!(store instanceof CacheStoreInterface)) {
        throw new Error('`options.store` must implement `CacheStoreInterface`');
    }

    if (typeof options.ttl !== 'number') {
        options.ttl = 60 * 5; //5minutes in seconds
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

            var uniq = hash({
                headers: config.headers,
                params: config.params
            }, {
                algorithm: 'sha1',
                excludeValues: false,
                encoding: 'hex',
                ignoreUnknown: false,
                respectType: false,
                unorderredArrays: false,
                unorderedSets: true
            });

            var key = config.url + uniq;

            return store.get(key).catch(function(err) {
                return !(err instanceof CacheStoreInterface.NotFoundError);
            }, function(err) {
                //TODO log the err and continue
                throw err;
            }).catch(CacheStoreInterface.NotFoundError, function() {
                // fallback to the http request if cached data does not exist
                return _adapter(config).then(function(response) {
                    return store.set(key, response, options.ttl).return(response);
                });
            });
        };
    };
}