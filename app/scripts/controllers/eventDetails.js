'use strict';

angular.module('confRegistrationWebApp')
  .controller('eventDetailsCtrl', function ($rootScope, $scope, $http, $sce, $timeout, $window, modalMessage, $filter, $location, conference, ConfCache, permissions, permissionConstants, uuid) {
    $rootScope.globalPage = {
      type: 'admin',
      mainClass: 'container event-details',
      bodyClass: '',
      title: conference.name,
      confId: conference.id,
      footer: true
    };
    if (permissions.permissionInt >= permissionConstants.UPDATE) {
      $scope.templateUrl = 'views/eventDetails.html';
    } else {
      $scope.templateUrl = 'views/permissionError.html';
    }

    $scope.tabs = [
      {id: 'eventInfo', name: 'Event Information', view: 'views/eventDetails/eventInformation.html'},
      {id: 'regOptions', name: 'Registration Options', view: 'views/eventDetails/regOptions.html'},
      {id: 'regTypes', name: 'Registration Types', view: 'views/eventDetails/regTypes.html'},
      {id: 'paymentOptions', name: 'Payment Options', view: 'views/eventDetails/paymentOptions.html'},
      {id: 'contactInfo', name: 'Contact Information', view: 'views/eventDetails/contactInfo.html'}
    ];

    $scope.changeTab = function(tab){
      $scope.activeTab = tab;
    };
    $scope.changeTab($scope.tabs[0]);

    $scope.paymentGateways = [
      {id: 'AUTHORIZE_NET', name: 'Authorize.Net'}
    ];

    $scope.conference = angular.copy(conference);

    $scope.$on('$locationChangeStart', function(event, newLocation) {
      if(!angular.equals(conference, $scope.conference)){
        event.preventDefault();
        modalMessage.confirm({
          title: 'Warning',
          question: 'You have some unsaved changes on this page, are you sure you want to leave? Your changes will be lost.',
          normalSize: true
        }).then(function(){
          conference = angular.copy($scope.conference);
          $location.url($location.url(newLocation).hash());
        });
      }
    });

    $scope.addRegType = function(){
      $scope.conference.registrantTypes.push({
        id: uuid(),
        cost: 0,
        earlyRegistrationCutoff: moment().add(7, 'days').format('YYYY-MM-DD HH:mm:ss')
      });
    };

    $scope.deleteRegType = function(id){
      if ($scope.conference.registrantTypes.length > 1) {
        _.remove($scope.conference.registrantTypes, function(type) { return type.id === id; });
      } else {
        $scope.notify = {
          class: 'alert-danger',
          message: $sce.trustAsHtml('You must have at least one registration type per event.')
        };
        $timeout(function() { $scope.notify = {}; }, 3500);
      }
    };

    $scope.saveEvent = function () {
      //validation check
      var validationErrors = [];

      //Event Name
      if (_.isEmpty($scope.conference.name)) {
        validationErrors.push('Please enter an event name.');
      }

      //Event Dates
      if ($scope.conference.eventStartTime > $scope.conference.eventEndTime) {
        validationErrors.push('Event end date/time must be after event start date/time.');
      }

      //Registration Window
      if ($scope.conference.registrationStartTime > $scope.conference.registrationEndTime) {
        validationErrors.push('Registration end date/time must be after registration start date/time.');
      }

      //Registrant Name
      angular.forEach($scope.conference.registrantTypes, function(t) {
        if (_.isEmpty(t.name)) {
          validationErrors.push('Please enter a name for all registration types.');
        }
      });

      //Event Cost
      angular.forEach($scope.conference.registrantTypes, function(t) {
        t.cost = Number(t.cost);
        if ( _.isNaN(t.cost) || t.cost < 0) {
          validationErrors.push('Event cost for \'' + t.name + '\' must be a positive number.');
        }
      });

      //Credit cards
      if (_.isEmpty($scope.conference.paymentGatewayId) && _.some($scope.conference.registrantTypes, 'acceptCreditCards')) {
        validationErrors.push('Please enter a credit card Account ID.');
      }

      //Minimum Deposit
      angular.forEach($scope.conference.registrantTypes, function(t) {
        if ($scope.conference.requireLogin && $scope.anyPaymentMethodAccepted(t) && String(t.minimumDeposit).length > 0 && !_.isNull(t.minimumDeposit)) {
          t.minimumDeposit = Number(t.minimumDeposit);
          if (t.minimumDeposit > t.cost) {
            validationErrors.push('The minimum deposit for \'' + t.name + '\' must be less than the cost.');
          }
        } else {
          t.minimumDeposit = null;
        }
      });

      //Early bird discount
      angular.forEach($scope.conference.registrantTypes, function(t) {
        angular.forEach(t.earlyRegistrationDiscounts, function(d, index){
          if (d.enabled) {
            d.amountOfDiscount = Number(d.amountOfDiscount);
            if (d.amountOfDiscount < 0) {
              validationErrors.push('Early registration discount ' + (index + 1) + ' for \'' + t.name + '\' must be a positive number.');
            }
            if (!d.deadline) {
              validationErrors.push('Early registration discount ' + (index + 1) + ' for \'' + t.name + '\' must include a valid date and time.');
            }
          }
        });
      });

      $window.scrollTo(0, 0);
      if (validationErrors.length > 0) {
        var errorMsg = '<strong>Error!</strong> Please fix the following issues:<ul>';
        angular.forEach(validationErrors, function (e) {
          errorMsg = errorMsg + '<li>' + e + '</li>';
        });
        errorMsg = errorMsg + '</ul>';
        $scope.notify = {
          class: 'alert-danger',
          message: $sce.trustAsHtml(errorMsg)
        };
      } else {
        $scope.notify = {
          class: 'alert-warning',
          message: $sce.trustAsHtml('Saving...')
        };

        $http(
          {method: 'PUT',
            url: 'conferences/' + conference.id,
            data: $scope.conference
        }).success(function () {
            $scope.notify = {
              class: 'alert-success',
              message: $sce.trustAsHtml('<strong>Saved!</strong> Your event details have been updated.')
            };

            conference = angular.copy($scope.conference);
            //Clear cache
            ConfCache.empty();
          }).error(function (data) {
            $scope.notify = {
              class: 'alert-danger',
              message: $sce.trustAsHtml('<strong>Error</strong> ' + data.errorMessage)
            };
          });
      }
    };

    $scope.anyPaymentMethodAccepted = function(type){
      return type.acceptCreditCards || type.acceptChecks || type.acceptTransfers || type.acceptScholarships;
    };

    $scope.acceptedPaymentMethods = function(){
      var regTypes = $scope.conference.registrantTypes;

      var paymentMethods = {
        acceptCreditCards: _.some(regTypes, 'acceptCreditCards'),
        acceptChecks:_.some(regTypes, 'acceptChecks'),
        acceptTransfers: _.some(regTypes, 'acceptTransfers'),
        acceptScholarships: _.some(regTypes, 'acceptScholarships')
      };
      return paymentMethods;
    };

    $scope.previewEmail = function(reg){
      var cost = $filter('currency')(reg.cost, '$');
      var eventStartTime = moment(conference.eventStartTime).format('dddd, MMMM D YYYY, h:mm a');
      var eventEndTime = moment(conference.eventEndTime).format('dddd, MMMM D YYYY, h:mm a');
      modalMessage.info({
        'title': 'Email Preview',
        'message': '<p>Hello ' + $rootScope.globalGreetingName + '!</p><p>You are registered for ' + $scope.conference.name + '.</p>' +
        '<p><strong>Start Time:</strong> ' + eventStartTime + '<br><strong>End Time:</strong> ' + eventEndTime + '</p>' +
        '<p><strong>Total Cost:</strong> ' + cost + '<br><strong>Total Amount Paid:</strong> ' + cost + '<br><strong>Remaining Balance:</strong> $0.00</p>' +
        reg.customConfirmationEmailText,
        'okString': 'Close'
      });
    };
  });
