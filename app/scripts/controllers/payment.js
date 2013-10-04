'use strict';

angular.module('confRegistrationWebApp')
  .controller('paymentCtrl', function ($scope, $location, registration, conference, $http) {
    $scope.conference = conference;
    $scope.currentYear = new Date().getFullYear();
    $scope.payment = {};
    $scope.amount = conference.minimumDeposit;

    $scope.createPayment = function () {
      $http.post('registrations/' + registration.id + '/payment', {'registrationId': registration.id})
        .success(function (result) {
          console.log('payment created: ' + result.id);
          $scope.payment = result;

          $http.put('registrations/' + registration.id + '/payment/' + result.id, {
            'id': result.id,
            'amount': $scope.amount,
            'registrationId': registration.id,
            'creditCardNameOnCard': $scope.creditCardNameOnCard,
            'creditCardExpirationMonth': $scope.creditCardExpirationMonth,
            'creditCardExpirationYear': $scope.creditCardExpirationYear,
            'creditCardNumber': $scope.creditCardNumber
          }).success(function (result) {
              $scope.payment = result;
              if (registration.completed === false) {
                $location.path('/reviewRegistration/' + conference.id);
              } else {
              }
            });

          $http.get('registrations/' + registration.id + '/payment/' + result.id).success(function (result) {
            console.log(result);
          });
        });
    };
  });
//
//private UUID id;
//private UUID registrationId;
//private String creditCardNameOnCard;
//private String creditCardExpirationMonth;
//private String creditCardExpirationYear;
//private String creditCardNumber;
//private BigDecimal amount;
//private DateTime transactionDatetime;
