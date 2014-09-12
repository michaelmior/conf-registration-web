'use strict';

angular.module('confRegistrationWebApp')
  .controller('paymentModal', function ($scope, $modalInstance, $http, registration, conference, RegistrationCache) {
    $scope.registration = registration;
    $scope.conference = conference;
    $scope.currentYear = new Date().getFullYear();
    $scope.processing = false;

    $scope.close = function () {
      $modalInstance.close($scope.registration);
    };

    $scope.registrantName = function(registrantId) {
      var nameBlock = _.find(_.flatten(conference.registrationPages, 'blocks'), { 'profileType': 'NAME' }).id;
      var registrant = _.find(registration.registrants, { 'id': registrantId });
      nameBlock = _.find(registrant.answers, { 'blockId': nameBlock }).value;

      return nameBlock.firstName + ' ' + nameBlock.lastName;
    };

    $scope.newPayment = {
      registrationId: registration.id,
      amount: registration.calculatedTotalDue
    };

    $scope.updateCostRegistration = [];
    angular.forEach(registration.registrants, function (r) {
      $scope.updateCostRegistration[r.id] = r.totalDue;
    });

    $scope.processPayment = function () {
      if (_.isEmpty($scope.newPayment.paymentType)) {
        alert('Please select a payment type.');
        return;
      }
      if (Number($scope.newPayment.amount) <= 0 || _.isEmpty($scope.newPayment.amount)) {
        alert('Payment amount must be a positive number.');
        return;
      }

      $scope.processing = true;
      $scope.newPayment.readyToProcess = true;
      $http.post('payments/', $scope.newPayment).success(function () {
        $http.get('registrations/' + $scope.registration.id).success(function (data) {
          $scope.registration = data;
          $scope.processing = false;
          $scope.close();
        });
        delete $scope.newPayment;

      }).error(function () {
        alert('Payment failed...');
        $scope.processing = false;
      });
    };

    $scope.canBeRefunded = function (payment) {
      var sum = 0;
      _.each($scope.registration.pastPayments, function (prevRefund) {
        if ((prevRefund.paymentType === 'CREDIT_CARD_REFUND' || prevRefund.paymentType === 'REFUND') &&
          prevRefund.refundedPaymentId === payment.id) {
          sum += prevRefund.amount;
        }
      });
      return payment.paymentType !== 'CREDIT_CARD_REFUND' &&
        payment.paymentType !== 'REFUND' &&
        sum < payment.amount;
    };

    $scope.refund = function (payment) {
      var refund;
      if (payment.paymentType === 'CREDIT_CARD') {
        refund = {
          amount: payment.amount,
          refundedPaymentId: payment.id,
          registrationId: payment.registrationId,
          paymentType: 'CREDIT_CARD_REFUND',
          creditCard: {
            lastFourDigits: payment.creditCard.lastFourDigits
          },
          readyToProcess: true
        };
      } else {
        refund = {
          amount: payment.amount,
          refundedPaymentId: payment.id,
          registrationId: payment.registrationId,
          paymentType: 'REFUND',
          readyToProcess: true
        };
      }

      $scope.processing = true;
      $http.post('payments/', refund).success(function () {
        $http.get('registrations/' + $scope.registration.id).success(function (data) {
          //RegistrationCache.update('registrations/' + data.id, data, function () {});
          $scope.registration = data;
          $scope.processing = false;
        });
      }).error(function () {
        alert('Refund failed...');
        $scope.processing = false;
      });
    };

    $scope.saveCost = function () {
      var updatedRegistration = angular.copy(registration);
      angular.forEach(updatedRegistration.registrants, function(r) {
        r.totalDue = Number($scope.updateCostRegistration[r.id]);
      });

      RegistrationCache.update('registrations/' + updatedRegistration.id, updatedRegistration, function () {
        RegistrationCache.emptyCache();
        RegistrationCache.get(updatedRegistration.id).then(function(data){
          $scope.registration = data;
        });
        $scope.showUpdateCost = false;
      }, function () {
        alert('Error updating total cost');
      });
    };

    $scope.toggleCostUpdate = function(v) {
      $scope.showUpdateCost = v;
    };
  });