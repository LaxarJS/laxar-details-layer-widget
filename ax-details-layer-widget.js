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
         sourceElementSelector: null
      };

      patterns.actions.handlerFor( $scope )
         .registerActionsFromFeature( 'open', handleOpenAction )
         .registerActionsFromFeature( 'close', handleCloseAction );

      $scope.functions = {
         closeViaCloseIcon: function() {
            if( !$scope.features.closeIcon.enabled ) {
               return;
            }

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
            sourceElementSelector: '=',
            onClose: '='
         },
         link: function( scope, element ) {
            var previousBodyOverflowValue;
            element.css( 'display', 'none' );

            var escapeCloseHandler = function( event ) {
               if( event.keyCode === 27 && typeof scope.onClose === 'function' ) {
                  scope.$apply( scope.onClose );
               }
            };

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
                  previousBodyOverflowValue = document.body.style.overflow;
                  document.body.style.overflow = 'hidden';
                  openLayer( sourceElement );
                  ng.element( document.body ).on( 'keyup', escapeCloseHandler );
               }
               else {
                  document.body.style.overflow = previousBodyOverflowValue;
                  closeLayer( sourceElement );
                  ng.element( document.body ).off( 'keyup', escapeCloseHandler );
               }
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function openLayer( sourceElement ) {
               var boundingBox = sourceElement && sourceElement.getBoundingClientRect();
               if( sourceElement ) {

                  var scaling = boundingBox.width / viewPortWidth();

                  element.css( 'top', boundingBox.top + 'px' );
                  element.css( 'left', boundingBox.left + 'px' );
                  element.css( 'transform', 'scale( ' + scaling + ')' );
                  element.css( 'opacity', 0.3 );

                  element.addClass( 'abp-with-source-animation' );
               }

               element.css( 'display', 'block' );

               /*jshint -W030:false */
               element[0].offsetWidth; // Triggering reflow. Otherwise the animation won't work

               if( sourceElement ) {
                  element.css( 'top', '' );
                  element.css( 'left', '' );
                  element.css( 'transform', 'scale(1)' );
                  element.css( 'opacity', 1 );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function closeLayer( sourceElement ) {
               var boundingBox = sourceElement && sourceElement.getBoundingClientRect();
               if( sourceElement ) {
                  element.addClass( 'abp-with-source-animation' );

                  var scaling = boundingBox.width / viewPortWidth();
                  element.css( 'top', boundingBox.top + 'px' );
                  element.css( 'left', boundingBox.left + 'px' );
                  element.css( 'transform', 'scale( ' + scaling + ')' );
                  element.css( 'opacity', 0.3 );

                  element.one( 'transitionend', function() {
                     element.css( 'display', 'none' );
                  } );
               }
               else {
                  element.css( 'display', 'none' );
               }
            }

            /////////////////////////////////////////////////////////////////////////////////////////////////////

            function viewPortWidth() {
               return Math.max( document.documentElement.clientWidth, window.innerWidth || 0 );
            }
         }
      };
   } ];

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return ng.module( 'axDetailsLayerWidget', [] )
      .controller( 'AxDetailsLayerWidgetController', Controller )
      .directive( layerDirectiveName, layerDirective );

} );
