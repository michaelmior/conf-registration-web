'use strict';

angular.module('confRegistrationWebApp')
  .factory('payment', function ($q, $http, $filter, cruPayments, envService, error) {
    // Load the TSYS manifest
    // Returns a promise that resolves to the manifest value
    function loadTsysManifest (conference, payment) {
      var url = 'payments/manifest/' + conference.id;
      return $http.get(url, { data: payment }).then(function (res) {
        return res.data;
      });
    }

    // Modify a credit card payment to use a tokenized credit card instead of real credit card data
    // Tokenize the credit card via Authorize.NET
    function tokenizeCreditCardPaymentAuthorizeNet (conference, payment) {
      return $http.get('payments/ccp-client-encryption-key').then(function (res) {
        var ccpClientEncryptionKey = res.data;
        ccp.initialize(ccpClientEncryptionKey);
        payment.creditCard.lastFourDigits = ccp.getAbbreviatedNumber(payment.creditCard.number);
        payment.creditCard.number = ccp.encrypt(payment.creditCard.number);
        payment.creditCard.cvvNumber = ccp.encrypt(payment.creditCard.cvvNumber);
      }).catch(error.errorFromResponse('An error occurred while requesting the Authorize.NET token. Please try your payment again.'));
    }

    // Modify a credit card payment to use a tokenized credit card instead of real credit card data
    // Tokenize the credit card via TSYS
    function tokenizeCreditCardPaymentTsys (conference, payment) {
      return $q.when()
        .then(function () {
          return loadTsysManifest(conference, payment);
        })
        .then(function (manifest) {
          cruPayments.init(envService.read('tsysEnvironment'), conference.paymentGatewayId, manifest);
          return cruPayments.encrypt(payment.creditCard.number, payment.creditCard.cvvNumber,
                                     payment.creditCard.expirationMonth, payment.creditCard.expirationYear).toPromise();
        })
        .then(function (tokenizedCard) {
          payment.creditCard.lastFourDigits = tokenizedCard.maskedCardNumber;
          payment.creditCard.number = tokenizedCard.tsepToken;
          payment.creditCard.cvvNumber = tokenizedCard.cvv2;
        })
        .catch(error.errorFromResponse('An error occurred while requesting the TSYS token. Please try your payment again.'));
    }

    return {
      // Validate a payment and return a boolean indicating whether or not it is valid
      validate: function (payment, registration) {
        /*
        If the totalPaid (previously) AND the amount of this payment are less than the minimum required deposit, then
        show and error message. The first payment must be at least the minimum deposit amount. Subsequent payments can be
        less than the amount. This is confirmed by making sure the total previously paid is above the min deposit amount.
        */

        if (registration.pastPayments.length === 0 && Number(payment.amount) < registration.calculatedMinimumDeposit) {
          payment.errors.push('You are required to pay at least the minimum deposit of ' + $filter('currency')(registration.calculatedMinimumDeposit, '$') + ' to register for this event.');
        }

        if (Number(payment.amount) > registration.remainingBalance) {
          payment.errors.push('You are paying more than the total due of ' + $filter('currency')(registration.remainingBalance, '$') + ' to register for this event.');
        }

        // The payment is valid if it has no errors
        return _.isEmpty(payment.errors);
      },

      // Submit payment for a current registration
      pay: function (payment, conference, registration, acceptedPaymentMethods) {
        if (Number(payment.amount) === 0 || !acceptedPaymentMethods || payment.paymentType === 'PAY_ON_SITE') {
          // No payment is necessary, so no work needs to be done here
          return $q.when();
        }

        // Prepare the payment object
        var currentPayment = angular.copy(payment);
        currentPayment.registrationId = registration.id;
        delete currentPayment.errors;

        return $q.when().then(function () {
          if (currentPayment.paymentType === 'CREDIT_CARD') {
            // Credit card payments must be tokenized first
            if (conference.paymentGatewayType === 'TSYS') {
              return tokenizeCreditCardPaymentTsys(conference, currentPayment);
            } else if (conference.paymentGatewayType === 'AUTHORIZE_NET') {
              return tokenizeCreditCardPaymentAuthorizeNet(conference, currentPayment);
            } else {
              throw new Error('Unrecognized payment gateway.');
            }
          }
        }).then(function () {
          // Submit the payment
          return $http.post('payments/', currentPayment);
        }).catch(error.errorFromResponse('An error occurred while attempting to process your payment.'));
      }
    };
  });
