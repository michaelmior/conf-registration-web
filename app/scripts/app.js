'use strict';

angular.module('confRegistrationWebApp', ['ngMockE2E', 'ngResource'])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .when('/register/:conferenceId', {
        controller: 'RegisterCtrl',
        template: '',
        resolve: {
          conference: ['$route', 'Conferences', function (Conferences, $route) {
            return Conferences.getById($route.current.params.conferenceId); // todo handle a not found conference
          }]
        }
      })
      .when('/register/:conferenceId/page/:pageId', {
        templateUrl: 'views/page.html',
        controller: 'PageCtrl',
        resolve: {
          conference: ['$route', 'Conferences', '$q', function ($route, Conferences, $q) {
            var defer = $q.defer();

            Conferences.get({id: $route.current.params.conferenceId}, function (data) {
              defer.resolve(data);
            });

            return defer.promise;
          }]
        }
      })
      .otherwise({
        redirectTo: '/'
      });
  });
