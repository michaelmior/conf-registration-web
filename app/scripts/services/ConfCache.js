'use strict';

angular.module('confRegistrationWebApp')
  .service('ConfCache', function ConfCache($cacheFactory, $rootScope, $http, $q) {
    var cache = $cacheFactory('conf');

    var path = function (id) {
      return 'conferences/' + (id || '');
    };

    var checkCache = function (path, callback) {
      var cachedConferences = cache.get(path);
      if (angular.isDefined(cachedConferences)) {
        callback(cachedConferences, path);
      } else {
        $http.get(path).success(function (conferences) {
          cache.put(path, conferences);
          callback(conferences, path);
        });
      }
    };

    this.query = function (id) {
      checkCache(path(id), function (conferences, path) {
        $rootScope.$broadcast(path, conferences);
      });
    };

    this.get = function (id) {
      var defer = $q.defer();
      checkCache(path(id), function (conferences) {
        defer.resolve(conferences);
      });
      return defer.promise;
    };
  });
