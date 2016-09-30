'use strict';

angular.module('confRegistrationWebApp')
  .directive('pickADate', function() {
    return {
      templateUrl: 'views/components/pickadate.html',
      restrict: 'E',
      require: 'ngModel',
      scope: {
        'disabled': '=pickerDisabled',
        'minDate':'=?pickerMinDate',
        'maxDate':'=?pickerMaxDate'
      },
      link: function (scope, element, attr, ngModelController) {
        //load date value from model into datepicker
        var loaded = false;
        scope.$watch(function(){
            return ngModelController.$viewValue;
          },
          function(value){
            if(!loaded && !_.isEmpty(value)){ //only set value of picker to value of model once when directive is first loaded
              scope.picker.set('select', value, { format: 'yyyy-mm-dd', muted: true });
              loaded = true;
            }
          });

        var pickerOptions = {
          format: 'mmm d, yyyy',
          selectYears: 200
        };

        if(element.parents('.modal').length){
          pickerOptions.container = 'body';
        }

        //initialize datepicker
        scope.picker = $(element).find('input').first().pickadate(pickerOptions).pickadate('picker');

        //function to set min date
        scope.setMinDate = function(){
          if(!angular.isUndefined(scope.minDate) && scope.minDate !== ''){
            var dateArray = scope.minDate.split('-');
            dateArray[1] = dateArray[1] - 1;
            scope.picker.set('min',dateArray);
          }
        };
        
        //function to set max date
        scope.setMaxDate = function(){
          if(!angular.isUndefined(scope.maxDate) && scope.maxDate !== ''){
            var dateArray = scope.maxDate.split('-');
            dateArray[1] = dateArray[1] - 1;
            scope.picker.set('max',dateArray);
          }
        };
		
        //set min and max date
        scope.setMinDate();
        scope.setMaxDate();

        scope.$watch('minDate', function (newMinDate) {
          if (angular.isUndefined(newMinDate) || newMinDate === '') {
             scope.picker.set('min',false);
            return;
          }        
          
          var dateArray = newMinDate.split('-');
          dateArray[1] = dateArray[1] - 1;
          scope.picker.set('min',dateArray);         
        }, true);

        scope.$watch('maxDate', function (newMaxDate) {
          if (angular.isUndefined(newMaxDate) || newMaxDate === '') {
             scope.picker.set('max',false);
            return;
          }
          
          var dateArray = newMaxDate.split('-');          
          dateArray[1] = dateArray[1] - 1;         
          scope.picker.set('max',dateArray); 
        }, true);

        //when date is chosen, update model
        var onSet = function(){
            ngModelController.$setViewValue(scope.picker.get('select', 'yyyy-mm-dd'));
            ngModelController.$setTouched();
        };
        scope.picker.on('set', onSet);

        //disable picker when disabled attribute is true
        scope.$watch(function(){
            return scope.disabled;
          },
          function(disabled){
            if (disabled){
              scope.picker.stop();  //this destroys the onSet event callback
            }else{
              scope.picker.start();
              scope.picker.on('set', onSet);
              
              scope.setMinDate();
              scope.setMaxDate();              
            }
          });

        //open datepicker when icon is clicked
        scope.open = function(event){
          scope.picker.open();
          event.stopPropagation();
        };
      }         
    };
  });
