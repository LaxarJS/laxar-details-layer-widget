/**
 * Copyright 2015 aixigo AG
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
         close: function() {
            if( $scope.features.closeIcon.enabled ) {
               handleCloseAction();
            }
         },
         whenVisibilityChanged: function( visible ) {
            visibilityRequestPublisher( visible );
         }
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      if( usesPlaceParameter() ) {
         $scope.eventBus.subscribe( 'didNavigate', function( event ) {
            var navSettings = $scope.features.navigation;
            $scope.model.isOpen = event.data != null &&
               ( event.data[ navSettings.parameterName ] === navSettings.parameterValue );
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function handleOpenAction( event ) {
         if( $scope.model.isOpen ) {
            return;
         }

         $scope.model.isOpen = true;
         $scope.model.sourceElementSelector = $scope.features.animateFrom.actionSelectorPath ?
            ax.object.path( event, $scope.features.animateFrom.actionSelectorPath, null ) :
            null;

         publishPlaceParameter();
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function handleCloseAction() {
         if( !$scope.model.isOpen ) {
            return;
         }
         $scope.model.isOpen = false;
         publishPlaceParameter();
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function usesPlaceParameter() {
         var navSettings = $scope.features.navigation;
         return navSettings.parameterName && navSettings.parameterValue;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function publishPlaceParameter() {
         if( !usesPlaceParameter() ) {
            return;
         }
         var navSettings = $scope.features.navigation;
         if( navSettings.parameterName && navSettings.parameterValue ) {
            var parameters = {};
            parameters[ navSettings.parameterName ] = $scope.model.isOpen ?
               navSettings.parameterValue :
               null;
            $scope.eventBus.publish( 'navigateRequest._self', {
               target: '_self',
               data: parameters
            } );
         }
      }

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var layerDirectiveName = 'axDetailsLayer';
   var layerDirective = [ function() {
      return {
         scope: {
            isOpen: '=' + layerDirectiveName + 'IsOpen',
            sourceElementSelector: '=' + layerDirectiveName + 'SourceElementSelector',
            useActiveElement: '=' + layerDirectiveName + 'UseActiveElement',
            onClose: '=' + layerDirectiveName + 'OnClose',
            whenVisibilityChanged: '=' + layerDirectiveName + 'WhenVisibilityChanged',
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
            var previousPageYOffset;

            var sourceElement = null;
            scope.$watch( 'isOpen', function( open, wasOpen ) {
               if( open === wasOpen ) {
                  return;
               }

               if( open && scope.useActiveElement ) {
                  sourceElement = document.activeElement;
               }
               if( scope.sourceElementSelector ) {
                  sourceElement = document.querySelector( scope.sourceElementSelector ) || sourceElement;

                  if( !sourceElement ) {
                     ax.log.warn( 'laxar-details-layer-widget: source element selector [0] ' +
                        'does not match anything.', scope.sourceElementSelector );
                  }
               }

               // reset class. Will be set on-demand in the following
               element.removeClass( 'ax-details-layer-with-source-animation' );

               if( open ) {
                  openLayer( sourceElement );
               }
               else {
                  closeLayer( sourceElement );
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
                  var scaling = boundingBox.width / viewportWidth();
                  element.css( 'height', ( boundingBox.height / scaling ) + 'px' );
                  element.css( 'transform',
                    'translate3d( ' + boundingBox.left + 'px, ' + boundingBox.top + 'px, 0 )' +
                    'scale3d( ' + scaling + ', ' + scaling + ', 1 ) '
                  );
                  element.css( 'opacity', 0.3 );
                  element.addClass( 'ax-details-layer-with-source-animation' );
               }

               element.css( 'display', 'block' );

               /*jshint -W030:false */
               element[0].offsetWidth; // Triggering reflow. Otherwise the animation won't work

               if( sourceElement ) {
                  element.css( 'height', '' );
                  element.css( 'opacity', 1 );
                  element.css( 'transform', 'translate3d(0, 0, 0) scale3d( 1, 1, 1)' );
                  element.one( 'transitionend', completeOpening );
               }
               else {
                  completeOpening();
               }

               ///////////////////////////////////////////////////////////////////////////////////////////////

               function completeOpening() {
                  ng.element( document.body )
                     .on( 'keyup', escapeCloseHandler )
                     .addClass( 'modal-open' );
                  backdropElement.addClass( 'ax-details-layer-open' );
                  element.removeClass( 'ax-details-layer-with-source-animation' );
                  scope.whenVisibilityChanged( true );
                  preventBodyScrolling();
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function closeLayer( sourceElement ) {
               var boundingBox = sourceElement && sourceElement.getBoundingClientRect();
               ng.element( document.body )
                  .off( 'keyup', escapeCloseHandler )
                  .removeClass( 'modal-open' );
               if( sourceElement ) {
                  element.addClass( 'ax-details-layer-with-source-animation' );

                  var scaling = boundingBox.width / viewportWidth();
                  element.css( 'height', ( boundingBox.height / scaling ) + 'px' );
                  element.css( 'opacity', 0 );
                  element.css( 'transform',
                    'translate3d( ' + boundingBox.left + 'px, ' + boundingBox.top + 'px, 0 )' +
                    'scale3d( ' + scaling + ', ' + scaling + ', 1 ) '
                  );
                  backdropElement.removeClass( 'ax-details-layer-open' );
                  element.one( 'transitionend', completeClosing );
               }
               else {
                  backdropElement.removeClass( 'ax-details-layer-open' );
                  completeClosing();
               }

               ///////////////////////////////////////////////////////////////////////////////////////////////

               function completeClosing() {
                  element.removeClass( 'ax-details-layer-with-source-animation' );
                  element.css( 'display', 'none' );
                  scope.whenVisibilityChanged( false );
                  restoreBodyScrolling();
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function preventBodyScrolling() {
               previousPageYOffset = window.pageYOffset;

               element.parent().children().each( function( _, child ) {
                  var ch = ng.element( child );
                  ch.css( 'top', parseFloat( ch.css( 'top' ) ) + previousPageYOffset + 'px' );
               } );

               ng.element( document.body )
                  .css( 'position', 'fixed' )
                  .css( 'transform', 'translateY( -' + previousPageYOffset + 'px )' );
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function restoreBodyScrolling() {
               if( previousPageYOffset !== undefined ) {
                  element.parent().children().each( function( _, child ) {
                     var ch = ng.element( child );
                     ch.css( 'top', parseFloat( ch.css( 'top' ) ) - previousPageYOffset + 'px' );
                  } );
               }

               ng.element( document.body )
                  .css( 'position', '' )
                  .css( 'transform', '' );

               if( previousPageYOffset !== undefined ) {
                  window.scrollTo( window.pageXOffset, previousPageYOffset );
               }
            }

            //////////////////////////////////////////////////////////////////////////////////////////////////

            function viewportWidth() {
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
