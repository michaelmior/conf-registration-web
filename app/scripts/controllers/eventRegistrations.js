'use strict';

angular.module('confRegistrationWebApp')
  .controller('eventRegistrationsCtrl', function ($rootScope, $scope, $modal, $http, RegistrationCache, apiUrl, registrations, conference, permissions) {
    $rootScope.globalPage = {
      type: 'admin',
      mainClass: 'registrations',
      bodyClass: '',
      title: conference.name,
      confId: conference.id,
      footer: true
    };

    $scope.conference = conference;
    $scope.blocks = [];
    $scope.reversesort = false;
    $scope.order = 'name';
    $scope.showRegistrationsCompleted = 1;
    $scope.filterRegistrantType = '';
    $scope.visibleFilterRegistrantTypes = _.sortBy(conference.registrantTypes, 'name');
    $scope.visibleFilterRegistrantTypes.unshift({
      id: '',
      name: '-Any-'
    });
    var expandedRegistrations = {};

    $scope.registrations = registrations;
    $scope.registrants = _.flatten(registrations, 'registrants');

    //collect all blocks from the conferences' pages
    angular.forEach(conference.registrationPages, function (page) {
      angular.forEach(page.blocks, function (block) {
        if (block.type !== 'paragraphContent') {
          $scope.blocks.push(angular.copy(block));
        }
      });
    });

    // toggle (show/hide) column(s)
    $scope.toggleColumn = function (block) {
      $scope.blocks[block].visible = !$scope.blocks[block].visible;
      if(!$scope.blocks[block].visible){
        return;
      }

      RegistrationCache.getAllForConference(conference.id, _.pluck(_.where($scope.blocks, { 'visible': true }), 'id')).then(function(registrations){
        console.log(registrations);
        $scope.registrations = registrations;
        $scope.registrants = _.flatten(registrations, 'registrants');
        expandedRegistrations = {};
      });
    };

    $scope.blockIsVisible = function(block, registrantTypeId){
      return !_.contains(block.registrantTypes, registrantTypeId);
    };

    $scope.findAnswer = function (registration, blockId) {
      return _.find(registration.answers, function (answer) {
        return angular.equals(answer.blockId, blockId);
      });
    };

    $scope.answerSort = function (registration) {
      if (angular.isDefined($scope.order)) {
        if($scope.order === 'completed'){
          return $scope.getRegistration(registration.registrationId).completedTimestamp;
        }else if($scope.order === 'created'){
          return $scope.getRegistration(registration.registrationId).createdTimestamp;
        }else if($scope.order === 'type'){
          return $scope.getRegistrantType(registration.registrantTypeId).name;
        }else if($scope.order === 'name'){
          return registration.firstName + registration.lastName;
        }else if($scope.order === 'email') {
          return registration.email;
        }else{
          if (angular.isDefined($scope.findAnswer(registration, $scope.order))) {
            var answerValue = $scope.findAnswer(registration, $scope.order).value;
            if(_.isObject(answerValue)){
              return _.values($scope.findAnswer(registration, $scope.order).value).join(' ');
            }else{
              return answerValue;
            }
          }
        }
      } else {
        return 0;
      }
    };

    $scope.setOrder = function (order) {
      if (order === $scope.order) {
        $scope.reversesort = !$scope.reversesort;
      } else {
        $scope.reversesort = false;
      }
      $scope.order = order;
    };

    $scope.viewPayments = function (registrationId) {
      var paymentModalOptions = {
        templateUrl: 'views/modals/paymentsModal.html',
        controller: 'paymentModal',
        size: 'lg',
        backdrop: 'static',
        resolve: {
          registration: function () {
            return _.find(registrations, { 'id': registrationId });
          },
          conference: function () {
            return conference;
          }
        }
      };

      $modal.open(paymentModalOptions).result.then(function (updatedRegistration) {
        var localUpdatedRegistrationIndex = _.findIndex($scope.registrations, { 'id': updatedRegistration.id });
        $scope.registrations[localUpdatedRegistrationIndex] = updatedRegistration;
      });
    };

    // define payment categories
    $scope.paymentCategories = [
      {
        name: '-Any-',
        matches: function () {
          return true;
        }
      },
      {
        name: 'Full/Overpaid',
        matches: function (x, y) {
          return x >= y;
        }
      },
      {
        name: 'Partial',
        matches: function (x, y) {
          return x > 0 && x < y;
        }
      },
      {
        name: 'Full/Partial',
        matches: function (x) {
          return x > 0;
        }
      },
      {
        name: 'Not Paid',
        matches: function (x) {
          if (x === null) {
            return true;
          }

          return x <= 0;
        }
      },
      {
        name: 'Overpaid',
        matches: function (x, y) {
          return x > y;
        }
      }
    ];

    // set current to first in array
    $scope.currentPaymentCategory = _.first($scope.paymentCategories).name;

    // determine if registration payment status matches current payment category
    $scope.paymentStatus = function (registrant) {
      var registration = _.find(registrations, { 'id': registrant.registrationId });
      var paymentCategory = _.find($scope.paymentCategories, { 'name': $scope.currentPaymentCategory });
      return paymentCategory.matches(registration.totalPaid, registration.calculatedTotalDue);
    };

    $scope.completeStatus = function (registrant) {
      var registration = _.find(registrations, { 'id': registrant.registrationId });
      if ($scope.showRegistrationsCompleted) {
          return registration.completed;
      } else {
        return true;
      }
    };

    $scope.paidInFull = function (registrantId) {
      var registration = _.find(registrations, { 'id': registrantId });
      return registration.totalPaid >= registration.calculatedTotalDue;
    };

    $scope.expandRegistration = function (r) {
      if (expandedRegistrations[r] === 'open') {
        delete expandedRegistrations[r];
      } else {
        expandedRegistrations[r] = 'loading';

        $http.get('registrants/' + r).success(function (registrantData) {
          expandedRegistrations[r] = 'open';

          //update registrant
          var index = _.findIndex($scope.registrants, { 'id': registrantData.id });
          $scope.registrants[index] = registrantData;

          //update registration
          index = _.findIndex($scope.registrations, { 'id': registrantData.registrationId });
          var registrantIndex = _.findIndex($scope.registrations[index].registrants, { 'id': registrantData.id });
          $scope.registrations[index].registrants[registrantIndex] = registrantData;
        }).error(function(){
          alert('Error: registrant data could be be retrieved.');
          delete expandedRegistrations[r];
        });
      }
    };

    $scope.expandedStatus = function (r) {
      return expandedRegistrations[r];
    };

    $scope.editRegistrant = function (r) {
      $http.get('registrants/' + r).success(function (registrantData) {
        //get registration
        var registration = _.find($scope.registrations, { 'id': registrantData.registrationId });

        var editRegistrationDialogOptions = {
          templateUrl: 'views/modals/editRegistration.html',
          controller: 'editRegistrationModalCtrl',
          resolve: {
            registrant: function () {
              return registrantData;
            },
            registration: function () {
              return registration;
            },
            conference: function () {
              return conference;
            }
          }
        };

        $modal.open(editRegistrationDialogOptions).result.then(function (registration) {
          //update registration
          var index = _.findIndex($scope.registrations, { 'id': registration.id });
          $scope.registrations[index] = registration;

          //update registrant
          r = _.find(registration.registrants, { 'id': r });
          index = _.findIndex($scope.registrants, { 'id': r.id });
          $scope.registrants[index] = r;
        });
      }).error(function(){
        alert('Error: registrant data could be be retrieved.');
        delete expandedRegistrations[r];
      });
    };

    // Export conference registrations information to csv
    $scope.export = function () {
      $modal.open({
        templateUrl: 'views/modals/export.html',
        controller: 'exportDataModal',
        resolve: {
          conference: function() {
            return $scope.conference;
          },
          hasCost: function() {
            return $scope.eventHasCost();
          }
        }
      });
    };

    $scope.eventHasCost = function () {
      return _.max(_.flatten(conference.registrantTypes, 'cost')) > 0;
    };

    $scope.registerUser = function () {
      var registrationModalOptions = {
        templateUrl: 'views/modals/manualRegistration.html',
        controller: 'registrationModal',
        resolve: {
          conference: function () {
            return conference;
          }
        }
      };
      $modal.open(registrationModalOptions);
    };

    $scope.allowDeleteRegistration = function () {
      return permissions.permissionInt > 1;
    };

    $scope.getRegistration = function(id){
      return _.find(registrations, { 'id': id });
    };

    $scope.getRegistrantType = function(id){
      return _.find(conference.registrantTypes, { 'id': id });
    };

    $scope.deleteRegistrant = function (registrant) {
      var modalInstance = $modal.open({
        templateUrl: 'views/modals/deleteRegistration.html',
        controller: 'deleteRegistrationCtrl'
      });

      modalInstance.result.then(function (doDelete) {
        if (doDelete) {
          var registration = _.find(registrations, { 'id': registrant.registrationId });
          var url = 'registrations/' + registration.id;

          if(registration.registrants.length > 1){
            //Delete Registrant
            url = 'registrants/' + registrant.id;
          }

          $http({
            method: 'DELETE',
            url: url
          }).success(function () {
            _.remove($scope.registrants, function (r) {
              return r.id === registrant.id;
            });

            _.remove(registration.registrants, function (r) {
              return r.id === registrant.id;
            });
          });
        }
      });
    };
  });
