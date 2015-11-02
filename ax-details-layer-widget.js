/**
 * Copyright 2015 LaxarJS
 * Released under the MIT license
 * www.laxarjs.org
 */
define( [
   'angular',
   'laxar',
   'laxar-patterns'
], function( ng, ax, patterns ) {
   'use strict';

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   Controller.$inject = [ '$scope' ];

   function Controller( $scope ) {

      $scope.model = {
         isOpen: false,
         closeIconAvailable: true
      };

      patterns.actions.handlerFor( $scope )
         .registerActionsFromFeature( 'open', handleOpenAction )
         .registerActionsFromFeature( 'close', handleCloseAction );

      $scope.functions = {
         close: function() {
            $scope.model.isOpen = false;
         }
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function handleOpenAction( event ) {
         $scope.model.sourceElementSelector = event.sourceElementSelector || null;
         $scope.model.isOpen = true;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function handleCloseAction() {
         $scope.model.isOpen = false;
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var layerDirectiveName = 'axDetailsLayerWidgetLayer';
   var layerDirective = [ function() {
      return {
         scope: {
            isOpen: '=',
            areaName: '=',
            sourceElementSelector: '='
         },
         link: function( scope, element ) {
            element.css( 'display', 'none' );

            scope.$watch( 'isOpen', function( open ) {
               var sourceElement = null;
               if( scope.sourceElementSelector ) {
                  sourceElement = document.querySelector( scope.sourceElementSelector );

                  if( !sourceElement ) {
                     ax.log.warn( 'Received source element selector [0], ' +
                        'but the according DOM element could not be found.', scope.sourceElementSelector );
                  }
               }

               // reset class. Will be set on demand in the following
               element.removeClass( 'abp-with-source-animation' );

               if( open ) {
                  document.body.style.overflow = 'hidden';
                  openLayer( sourceElement );
               }
               else {
                  delete document.body.style.overflow;
                  closeLayer( sourceElement );
               }
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function openLayer( sourceElement ) {
               var boundingBox = sourceElement && sourceElement.getBoundingClientRect();
               if( sourceElement ) {
                  element.css( 'top', boundingBox.top + 'px' );
                  element.css( 'left', boundingBox.left + 'px' );
                  element.css( 'width', boundingBox.width + 'px' );
                  element.css( 'height', boundingBox.height + 'px' );
                  element.css( 'opacity', 0.3 );

                  element.addClass( 'abp-with-source-animation' );
               }

               element.css( 'display', 'block' );

               /*jshint -W030:false */
               element[0].offsetWidth; // Triggering reflow. Otherwise the animation won't work

               if( sourceElement ) {
                  element.css( 'top', '' );
                  element.css( 'left', '' );
                  element.css( 'width', '' );
                  element.css( 'height', '' );
                  element.css( 'opacity', 1 );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function closeLayer( sourceElement ) {
               var boundingBox = sourceElement && sourceElement.getBoundingClientRect();
               if( sourceElement ) {
                  element.addClass( 'abp-with-source-animation' );

                  element.css( 'top', boundingBox.top + 'px' );
                  element.css( 'left', boundingBox.left + 'px' );
                  element.css( 'width', boundingBox.width + 'px' );
                  element.css( 'height', boundingBox.height + 'px' );
                  element.css( 'opacity', 0.3 );

                  element.one( 'transitionend', function() {
                     element.css( 'display', 'none' );
                  } );
               }
               else {
                  element.css( 'display', 'none' );
               }
            }
         }
      };
   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var closeButtonDirectiveName = 'axDetailsLayerWidgetLayerCloseButton';
   var closeButtonDirective = [ function() {
      return {
         link: function( scope, element ) {

         }
      };
   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'axDetailsLayerWidget', [] )
      .controller( 'AxDetailsLayerWidgetController', Controller )
      .directive( layerDirectiveName, layerDirective )
      .directive( closeButtonDirectiveName, closeButtonDirective );

} );
