var Promise = require('bluebird');
var sinon = require('sinon');
var CacheStoreInterface = require('bi-cache-store-interface');

module.exports = StoreStub;

/**
 * @constructor
 */
function StoreStub() {
    CacheStoreInterface.call(this);
    this.store = {};
}

StoreStub.prototype = Object.create(CacheStoreInterface.prototype);
StoreStub.prototype.constructor = StoreStub;


/**
 * @public
 * @param {String} key
 *
 * @throws {Error} - async
 * @throws {NotFoundError} - async
 * @return {Promise}
 */
StoreStub.prototype.get = function(key) {
    var self = this;
    if (this.store.hasOwnProperty(key)) {
        return Promise.resolve(this.store[key]);
    } else {
    }
    return Promise.reject(new CacheStoreInterface.NotFoundError(key));
};

/**
 * @public
 * @param {String}  key
 * @param {mixed}   data
 * @param {Integer} ttl - in seconds
 *
 * @throws {Error} - async
 * @return {Promise}
 */
StoreStub.prototype.set = function(key, data, ttl) {
    this.store[key] = data;

    if (typeof ttl === 'number' && ttl !== 0) {

        setTimeout(function(self, key) {
            delete self.store[key];
        }, ttl*1000, this, key);
    }

    return Promise.resolve();
};
