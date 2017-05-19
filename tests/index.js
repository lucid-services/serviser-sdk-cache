var sinon          = require('sinon');
var chai           = require('chai');
var chaiAsPromised = require('chai-as-promised');
var sinonChai      = require("sinon-chai");
var hash           = require('object-hash');
var BIServiceSDK   = require('bi-service-sdk').BIServiceSDK;

global.Promise     = require('bluebird');

var cacheMiddleware = require('../index.js');
var StoreStub       = require('./storeStub.js');

//this makes sinon-as-promised available in sinon:
require('sinon-as-promised');

var expect = chai.expect;

chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.should();

describe('cache plugin', function() {
    before(function() {
        this.hash = function(data) {
            return hash(data, {
                algorithm: 'sha1',
                excludeValues: false,
                encoding: 'hex',
                ignoreUnknown: false,
                respectType: false,
                unorderredArrays: false,
                unorderedSets: true
            });
        };
    });

    beforeEach(function() {
        var self = this;
        this.sdk = new BIServiceSDK({baseURL: 'http://eu.httpbin.org'});

        this.getHeaders = function(custom) {
            var defaults = self.sdk.axios.defaults.headers;
            custom = custom || {};
            return Object.assign({}, defaults.common, defaults.get, custom);
        };
    });

    it('should throw when we do not provide `store` gateway', function() {
        var self = this;

        expect(function() {
            self.sdk.use(cacheMiddleware({store: null}));
        }).to.throw(Error);
    });

    it('should not throw', function() {
        var self = this;

        expect(function() {
            self.sdk.use(cacheMiddleware({store: new StoreStub}));
        }).to.not.throw(Error);
    });

    describe('', function() {

        beforeEach(function() {

            var self = this;

            this.cacheStore = new StoreStub();
            this.axiosAdapterSpy = sinon.spy(this.sdk.axios.defaults, 'adapter');
            this.storeGetSpy = sinon.spy(StoreStub.prototype, 'fetch');
            this.storeSetSpy = sinon.spy(StoreStub.prototype, 'settle');

            this.cacheTTL = 60 * 5; //5 minutes

            //must be called after this.axiosAdapterSpy
            this.sdk.use(cacheMiddleware({
                store: this.cacheStore,
                ttl: this.cacheTTL
            }));

            this.request = function(status, method, reqOptions) {
                reqOptions = reqOptions || {};
                method = method || 'get';
                var url = status == 200 ? method : `status/${status}`;

                self.headers = self.getHeaders();
                self.requestData = {foo: 'bar'};

                self.expectedKey = `http://eu.httpbin.org/${url}` + self.hash({
                    headers: self.headers,
                    params: self.requestData
                });

                return self.sdk.$request(Object.assign({
                    url: url,
                    method: method,
                    params: self.requestData,
                    headers: self.headers
                }, reqOptions));
            };
        });

        afterEach(function() {
            this.axiosAdapterSpy.restore();
            this.storeGetSpy.restore();
            this.storeSetSpy.restore();
        });

        describe('a request is not cached', function() {

            it('should call cache store "fetch" method with correct key', function() {

                var self = this;

                return this.request(200).should.be.fulfilled.then(function() {
                    self.storeGetSpy.should.have.been.calledOnce;
                    self.storeGetSpy.should.have.been.calledWith(self.expectedKey);
                });
            });

            it('should make a http request', function() {

                var self = this;

                return this.request(200).should.be.fulfilled.then(function() {
                    self.axiosAdapterSpy.should.have.been.calledOnce;
                    self.axiosAdapterSpy.should.have.been.calledAfter(self.storeGetSpy);
                });
            });

            it('should cache received data on successful response', function() {

                var self = this;

                return this.request(200).should.be.fulfilled.then(function(response) {
                    self.storeSetSpy.should.have.been.calledOnce;
                    self.storeSetSpy.should.have.been.calledAfter(self.storeGetSpy);
                    self.storeSetSpy.should.have.been.calledAfter(self.axiosAdapterSpy);
                    self.storeSetSpy.should.have.been.calledWith(self.expectedKey, response, self.cacheTTL);
                });
            });

            it('should not cache received data on UNsucessful response', function() {

                var self = this;

                return this.request(400).should.be.rejected.then(function(response) {
                    self.storeSetSpy.should.have.callCount(0);
                });
            });
        });

        describe('a request is cached', function() {
            beforeEach(function() {
                this.data = {
                    status: 200,
                    data: {
                        foo: 'bar'
                    },
                    headers: {
                        'content-type': 'application/json',
                        'access-control-allow-origin': '*',
                        'access-control-allow-credentials': 'true',
                        'content-length': '280',
                    }
                };
                this.cacheStore.settle('http://eu.httpbin.org/get96efa9416860c36198d7922ae3a38f3f80f231c3', this.data, 60);
                this.storeSetSpy.reset();
            });

            it('should return fulfilled promise with cached data', function() {
                var self = this;

                return this.request(200).should.be.fulfilled.then(function(response) {
                    response.should.be.eql(self.data);
                    self.storeGetSpy.should.have.been.calledOnce;
                });
            });

            it('should NOT make the actuall http request', function() {
                var self = this;

                return this.request(200).should.be.fulfilled.then(function(response) {
                    self.axiosAdapterSpy.should.have.callCount(0);
                });
            });

            it('should return rejected promise with an Error when call to the cacheStore.get fails', function() {
                var err = new Error('rejection test');
                this.storeGetSpy.restore();
                var storeGetStub = sinon.stub(StoreStub.prototype, 'fetch').returns(Promise.reject(err));

                return this.request(200).should.be.rejectedWith(err);
            });

            it('should NOT access cache store if we explicitly disable it (per request)', function() {
                var self = this;

                return this.request(200, 'get', {cache: false}).should.be.fulfilled.then(function(response) {
                    self.axiosAdapterSpy.should.have.been.calledOnce;
                    self.storeGetSpy.should.have.callCount(0);
                    self.storeSetSpy.should.have.callCount(0);
                });
            });
        });

        describe('other than GET requests', function() {
            it('should not cache POST request', function() {
                var self = this;

                return this.request(200, 'post').should.be.fulfilled.then(function(response) {
                    self.axiosAdapterSpy.should.have.been.calledOnce;
                    self.storeGetSpy.should.have.callCount(0);
                    self.storeSetSpy.should.have.callCount(0);
                });
            });

            it('should not cache PUT request', function() {
                var self = this;

                return this.request(200, 'put').should.be.fulfilled.then(function(response) {
                    self.axiosAdapterSpy.should.have.been.calledOnce;
                    self.storeGetSpy.should.have.callCount(0);
                    self.storeSetSpy.should.have.callCount(0);
                });
            });

            it('should not cache DELETE request', function() {
                var self = this;

                return this.request(200, 'delete').should.be.fulfilled.then(function(response) {
                    self.axiosAdapterSpy.should.have.been.calledOnce;
                    self.storeGetSpy.should.have.callCount(0);
                    self.storeSetSpy.should.have.callCount(0);
                });
            });

            it('should not cache PATCH request', function() {
                var self = this;

                return this.request(200, 'patch').should.be.fulfilled.then(function(response) {
                    self.axiosAdapterSpy.should.have.been.calledOnce;
                    self.storeGetSpy.should.have.callCount(0);
                    self.storeSetSpy.should.have.callCount(0);
                });
            });
        });
    });
});
