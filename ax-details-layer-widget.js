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

      patterns.visibility.handlerFor( $scope, {
         onAnyAreaRequest: function() {
            // respond with the visibility for all nested areas (in this case there is only one)
            return $scope.model.isOpen;
         }
      } );
      var visibilityRequestPublisher = patterns.visibility.requestPublisherForWidget( $scope );

      $scope.functions = {
         closeViaCloseIcon: function() {
            if( !$scope.features.closeIcon.enabled ) {
               return;
            }

            $scope.model.isOpen = false;
         },
         whenVisibilityChanged: function( visible ) {
            visibilityRequestPublisher( visible );
         }
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function handleOpenAction( event ) {
         $scope.model.sourceElementSelector = null;
         if( $scope.features.animateFrom.actionSelectorPath ) {
            $scope.model.sourceElementSelector =
               ax.object.path( event, $scope.features.animateFrom.actionSelectorPath, null );
         }

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
            useActiveElement: '=',
            onClose: '=',
            whenVisibilityChanged: '='
         },
         link: function( scope, element ) {

            element.css( 'display', 'none' );
            var backdropElement = element.parent().find( '.modal-backdrop' );

            var escapeCloseHandler = function( event ) {
               if( event.keyCode === 27 && typeof scope.onClose === 'function' ) {
                  scope.$apply( scope.onClose );
               }
            };

            // For iOS Safari: we need to make the body fixed in order to prevent background scrolling.
            // To maintain the scroll position, we translate the entire page upwards, and move the layer down.
            var verticalScrollCorrection;

            var sourceElement = null;
            scope.$watch( 'isOpen', function( open ) {
               if( open && scope.useActiveElement ) {
                  sourceElement = document.activeElement;
               }

               if( scope.sourceElementSelector ) {
                  sourceElement = document.querySelector( scope.sourceElementSelector ) || sourceElement;

                  if( !sourceElement ) {
                     ax.log.warn( 'Received source element selector [0], ' +
                        'but the according DOM element could not be found.', scope.sourceElementSelector );
                  }
               }

               // reset class. Will be set on-demand in the following
               element.removeClass( 'abp-with-source-animation' );

               if( open ) {
                  openLayer( sourceElement );
                  verticalScrollCorrection = document.body.scrollTop;

                  element.parent().children().each( function( _, child ) {
                     var ch = ng.element( child );
                     ch.css( 'top', parseInt( ch.css( 'top' ) ) + verticalScrollCorrection + 'px' );
                  } );

                  ng.element( document.body )
                     .on( 'keyup', escapeCloseHandler )
                     .addClass( 'modal-open' )
                     .css( 'position', 'fixed' )
                     .css( 'transform', 'translateY( -' + verticalScrollCorrection + 'px )' );
               }
               else {
                  closeLayer( sourceElement );
                  if( verticalScrollCorrection !== undefined ) {
                     element.parent().children().each( function( _, child ) {
                        var ch = ng.element( child );
                        ch.css( 'top', parseInt( ch.css( 'top' ) ) - verticalScrollCorrection + 'px' );
                     } );
                  }

                  ng.element( document.body )
                     .off( 'keyup', escapeCloseHandler )
                     .removeClass( 'modal-open' )
                     .css( 'position', '' )
                     .css( 'transform', '' );

                  if( verticalScrollCorrection !== undefined ) {
                     document.body.scrollTop = verticalScrollCorrection;
                  }
               }
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            scope.$on( '$destroy', function() {
               sourceElement = null;
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function openLayer( sourceElement ) {
               var boundingBox = sourceElement && sourceElement.getBoundingClientRect();
               if( sourceElement ) {

                  var scaling = boundingBox.width / viewPortWidth();
                  element.css( 'height', ( boundingBox.height / scaling ) + 'px' );
                  element.css( 'transform',
                    'translate3d( ' + boundingBox.left + 'px, ' + boundingBox.top + 'px, 0 )' +
                    'scale3d( ' + scaling + ', ' + scaling + ', 1 ) '
                  );
                  element.css( 'opacity', 0.3 );

                  element.addClass( 'abp-with-source-animation' );
               }

               element.css( 'display', 'block' );

               /*jshint -W030:false */
               element[0].offsetWidth; // Triggering reflow. Otherwise the animation won't work

               if( sourceElement ) {
                  element.css( 'height', '' );
                  element.css( 'transform', 'translate3d(0, 0, 0) scale3d( 1, 1, 1)' );
                  element.css( 'opacity', 1 );

                  element.one( 'transitionend', function() {
                     backdropElement.addClass( 'ax-open' );
                     scope.whenVisibilityChanged( true );
                  } );
               }
               else {
                  backdropElement.addClass( 'ax-open' );
                  scope.whenVisibilityChanged( true );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function closeLayer( sourceElement ) {
               var boundingBox = sourceElement && sourceElement.getBoundingClientRect();
               if( sourceElement ) {
                  element.addClass( 'abp-with-source-animation' );

                  var scaling = boundingBox.width / viewPortWidth();
                  element.css( 'height', ( boundingBox.height / scaling ) + 'px' );
                  element.css( 'transform',
                    'translate3d( ' + boundingBox.left + 'px, ' + boundingBox.top + 'px, 0 )' +
                    'scale3d( ' + scaling + ', ' + scaling + ', 1 ) '
                  );
                  element.css( 'opacity', 0.3 );

                  backdropElement.removeClass( 'ax-open' );
                  element.one( 'transitionend', function() {
                     element.css( 'display', 'none' );
                     scope.whenVisibilityChanged( false );
                  } );
               }
               else {
                  backdropElement.removeClass( 'ax-open' );
                  element.css( 'display', 'none' );
                  scope.whenVisibilityChanged( false );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

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
