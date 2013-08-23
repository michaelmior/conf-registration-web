'use strict';

angular.module('confRegistrationWebApp')
  .controller('FormDropAreaCtrl', function ($rootScope, $scope, uuid) {
    $scope.$on('dragVars', function (event, x) {
      $scope.blockId = x.blockId;
      $scope.moveType = x.moveType;
    });

    function makePositionArray(){
      var tempPositionArray = [];
      $scope.conference.registrationPages.forEach(function (page, pageIndex) {
        page.blocks.forEach(function (block, blockIndex) {
          tempPositionArray[block.id] = new Object({page: pageIndex, block: blockIndex});
        });
      });
      return tempPositionArray;
    }

    function getPageIndex(pageId){
      var tempPageIndex;
      $scope.conference.registrationPages.forEach(function (page, pageIndex) {
        if (pageId === page.id) {
          tempPageIndex = pageIndex;
        }
      });
      return tempPageIndex;
    }

    $scope.moveBlock = function (blockId, newPage, newPosition) {
      var tempPositionArray = makePositionArray();
      var newPageIndex = getPageIndex(newPage);

      console.log('=======MOVE BLOCK==========',blockId, newPageIndex, newPosition);
      var origPage = tempPositionArray[blockId].page;
      var origBlock = $scope.conference.registrationPages[origPage].blocks[tempPositionArray[blockId].block];
      $scope.deleteBlock(blockId);
      origBlock.pageId = newPage;  //Update page id
      $scope.conference.registrationPages[newPageIndex].blocks.splice(newPosition, 0, origBlock);
    };

    $scope.insertBlock = function (blockType, newPage, newPosition) {
      var tempPositionArray = makePositionArray();
      var newPageIndex = getPageIndex(newPage);

      console.log('=======NEW BLOCK==========',blockType, newPageIndex, newPosition);

      var newBlock = new Object({
        id: uuid(),
        content: '',
        pageId: newPage,
        required: false,
        title: 'New Question',
        type: blockType
      });
      console.log($scope.conference);

      $scope.$apply(function (scope) {
        scope.conference.registrationPages[newPageIndex].blocks.splice(newPosition, 0, newBlock);
      });
    };

    $scope.deleteBlock = function (blockId) {
      var tempPositionArray = makePositionArray();
      $scope.conference.registrationPages[tempPositionArray[blockId].page].blocks.splice(
        tempPositionArray[blockId].block,
        1
      );
    };
  });
