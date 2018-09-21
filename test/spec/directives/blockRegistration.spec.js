import 'angular-mocks';

describe('Directive: blockRegistration', function () {

  beforeEach(angular.mock.module('confRegistrationWebApp'));

  var element, scope, $compile, $rootScope, testData;
  beforeEach(inject(function(_$compile_, _$rootScope_, $templateCache, _testData_){
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    testData = _testData_;

    scope = $rootScope.$new();
    $templateCache.put('views/components/blockRegistration.html', '');

    scope.adminEditRegistrant = testData.registration.registrants[0];
    scope.block = testData.conference.registrationPages[1].blocks[4];

    element = $compile('<div block-registration></div>')(scope);

    scope.$digest();
  }));

  it('is false when choice is undefined', function() {
    expect(element.scope().choiceVisible(scope.block)).toBe(false);
  });

  it('choice should be visible without rules', function() {
    const choice = scope.block.content.choices[0];

    expect(element.scope().choiceVisible(scope.block, choice)).toBe(true);
  });
});
