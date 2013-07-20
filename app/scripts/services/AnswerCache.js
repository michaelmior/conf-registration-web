'use strict';

angular.module('confRegistrationWebApp')
  .service('AnswerCache', function AnswerCache($cacheFactory, $rootScope, $http, $q, $timeout) {
    var cache = $cacheFactory('answers');
    var blockIndex = $cacheFactory('blockIndex');

    var path = function (id) {
      return 'answers/' + (id || '');
    };

    var update = function (path, object) {
      updateServer(object);
      cache.put(path, object);
      blockIndex.put(object.block, object);
      $rootScope.$broadcast(path, object);
    };

    var updateServer = function (answer) {
      $http.put(path(answer.id), answer);
    };

    var checkCache = function (path, callback) {
      var cachedObject = cache.get(path);
      if (angular.isDefined(cachedObject)) {
        callback(cachedObject, path);
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

    this.put = function (answer) {
      update(path(answer.id), answer);
    };

    var getByBlockId = function (blockId) {
      var defer = $q.defer();
      defer.resolve(blockIndex.get(blockId));
      return defer.promise;
    };

    this.syncByBlockId = function (scope, name, blockId) {
      scope[name] = blockIndex.get(blockId);
      scope.$watch(name, function (answer) {
        if(angular.isDefined(answer)) {
          update(path(answer.id), answer);
        }
      }, angular.equals);
    }
  });
