angular
  .module('confRegistrationWebApp')
  .service('journalUploadService', function JournalUploadService(
    $rootScope,
    $http,
    $q,
  ) {
    this.getRegistrationData = (
      conferenceId,
      queryParameters = {
        page: 1,
        limit: 20,
        orderBy: 'last_name',
        order: 'ASC',
        filter: '',
        filterAccountTransferErrors: 'yes',
        filterAccountTransfersByExpenseType: '',
        filterAccountTransfersByPaymentType: '',
        filterPayment: '',
        filterRegType: '',
        includeAccountTransfers: true,
        includeCheckedin: 'yes',
        includeWithdrawn: 'yes',
        includeIncomplete: 'yes',
      },
    ) => {
      const defer = $q.defer();
      $rootScope.loadingMsg = 'Loading Registrations';

      $http
        .get('conferences/' + conferenceId + '/registrations', {
          params: queryParameters,
        })
        .then(response => {
          $rootScope.loadingMsg = '';
          defer.resolve(response.data);
        })
        .catch(() => {
          $rootScope.loadingMsg = '';
          defer.reject();
        });

      return defer.promise;
    };

    this.getAccountTransferData = data => {
      return _.flatten(
        data.registrations.reduce((result, registrant) => {
          return [
            ...result,
            registrant.accountTransfers.map(accountTransfer => {
              accountTransfer.remainingBalance = registrant.remainingBalance;
              return accountTransfer;
            }),
          ];
        }, []),
      );
    };
  });
