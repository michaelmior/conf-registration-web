'use strict';

angular.module('confRegistrationWebApp')
  .controller('ReviewRegistrationCtrl', function ($scope, $rootScope, $location, registration, conference, $modal, Model) {

    $scope.conference = conference;
    $scope.registration = registration;
    $scope.answers = registration.answers;
    $scope.blocks = [];

    angular.forEach(conference.registrationPages, function (page) {
      angular.forEach(page.blocks, function (block) {
        if (block.type.indexOf('Content') === -1) {
          $scope.blocks.push(block);
        }
      });
    });

    $scope.findAnswer = function (blockId) {
      return _.find($scope.answers, {blockId: blockId});
    };

    $scope.confirmRegistration = function () {
      $('.btn-success').attr('value','Loading...');
      if (!conference.acceptCreditCards) {
        setRegistrationAsCompleted();
        return;
      }

      registration.currentPayment = $rootScope.currentPayment;
      registration.currentPayment.readyToProcess = true;

      Model.update('registrations/' + registration.id, registration, function (result) {
        console.log(result.status);

        if (result.status === 204) {
          setRegistrationAsCompleted();
          delete $rootScope.currentPayment;
        } else {
          console.log(result);
          var errorModalOptions = {
            templateUrl: 'views/errorModal.html',
            controller: 'errorModal',
            backdrop: 'static',
            keyboard: false,
            resolve: {
              message: function () {
                return 'Your card was declined, please verify and re-enter your details or use a different card.';
              }
            }
          };
          $modal.open(errorModalOptions).result.then(function () {
            $location.path('/payment/' + conference.id);
          });
          return;
        }
      });
    };

    function setRegistrationAsCompleted() {
      registration.currentPayment = {};
      delete registration.currentPayment;
      registration.completed = true;

      Model.update('registrations/' + registration.id, registration, function (result) {
        if (result.status == 204) {
          $scope.registration.completed = true;
        } else {
          alert('Error: ' + result.data.errorMessage);
        }
      });
    }

    $scope.editRegistration = function () {
      $location.path('/register/' + conference.id + '/page/' + conference.registrationPages[0].id);
    };
    $scope.editPayment = function () {
      $location.path('/payment/' + conference.id);
    };
  });
