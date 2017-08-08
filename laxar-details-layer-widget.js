/**
 * Copyright 2015-2017 aixigo AG
 * Released under the MIT license
 * www.laxarjs.org
 */
import * as ax from 'laxar';
import * as patterns from 'laxar-patterns';

export const injections = [ 'axAreaHelper', 'axContext', 'axEventBus', 'axLog', 'axVisibility', 'axWithDom' ];
export function create( areaHelper, context, eventBus, log, visibility, withDom ) {

   const features = context.features;

   let applyVisibility = () => {};
   let cleanUpLayer = () => {};

   let isOpen = false;
   let sourceElementSelector = null;
   let skipAnimations = false;

   patterns.actions.handlerFor( context )
      .registerActionsFromFeature( 'open', handleOpenAction )
      .registerActionsFromFeature( 'close', handleCloseAction );

   const closeActionPublisher = patterns.actions.publisherForFeature( context, 'close', { optional: true } );

   eventBus.subscribe( 'endLifecycleRequest', () => { cleanUpLayer(); } );

   if( usesPlaceParameter() ) {
      eventBus.subscribe( 'didNavigate', event => {
         const navSettings = features.navigation;
         const shouldOpen =
            event.data != null && ( event.data[ navSettings.parameterName ] === navSettings.parameterValue );
         if( shouldOpen ) { handleOpenAction(); }
         else { handleCloseAction(); }
      } );
   }
   updateContentAreaVisibility( false );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      onDomAvailable() {
         withDom( render );
      }
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function handleOpenAction() {
      if( isOpen ) {
         return;
      }
      isOpen = true;

      sourceElementSelector = features.animateFrom.actionSelectorPath ?
         ax.object.path( event, features.animateFrom.actionSelectorPath, null ) :
         null;
      skipAnimations = features.skipAnimations.actionSelectorPath ?
         ax.object.path( event, features.skipAnimations.actionSelectorPath, false ) :
         false;

      publishPlaceParameter();

      const { name, value } = features.logTag;
      if( name && value ) {
         log.setTag( name, value );
      }
      applyVisibility( isOpen );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function handleCloseAction() {
      if( !isOpen ) {
         return;
      }
      isOpen = false;

      publishPlaceParameter();

      const { name, value } = features.logTag;
      if( name && value ) {
         log.removeTag( name );
      }
      applyVisibility( isOpen );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function usesPlaceParameter() {
      const navSettings = context.features.navigation;
      return navSettings.parameterName && navSettings.parameterValue;
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function publishPlaceParameter() {
      if( !usesPlaceParameter() ) {
         return;
      }
      const navSettings = context.features.navigation;
      if( navSettings.parameterName && navSettings.parameterValue ) {
         const parameters = {};
         parameters[ navSettings.parameterName ] = isOpen ? navSettings.parameterValue : null;
         eventBus.publish( 'navigateRequest._self', {
            target: '_self',
            data: parameters
         } );
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function updateContentAreaVisibility( newState ) {
      visibility.updateAreaVisibility( {
         [ context.features.area.name ]: newState
      } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function render( element ) {
      const backdropElement = element.querySelector( '.modal-backdrop' );
      const layerElement = element.querySelector( '.ax-details-layer' );
      const contentElement = layerElement.querySelector( '.ax-details-layer-content' );
      const closeButtonElement = element.querySelector( '.ax-details-layer-close-button' );

      areaHelper.register( features.area.name, contentElement );

      const escapeCloseHandler = event => {
         if( event.keyCode === 27 && features.closeIcon.enabled ) {
            handleCloseAction();
         }
      };

      closeButtonElement.style.display = features.closeIcon.enabled ? '' : 'none';
      if( features.closeIcon.enabled ) {
         closeButtonElement.addEventListener( 'click', handleCloseAction );
      }

      if( features.backdropClose.enabled ) {
         backdropElement.addEventListener( 'click', handleCloseAction );
      }

      let lastTabWasShifted = false;
      let sourceElement = null;
      applyVisibility = open => {
         backdropElement.classList[ !( skipAnimations && open ) ? 'remove' : 'add' ]( 'fade' );

         if( open && features.animateFrom.activeElement ) {
            sourceElement = document.activeElement;
         }
         if( sourceElementSelector ) {
            sourceElement = document.querySelector( sourceElementSelector ) || sourceElement;

            if( !sourceElement ) {
               log.warn(
                  'laxar-details-layer-widget: source element selector [0] does not match anything.',
                  sourceElementSelector
               );
            }
         }

         // reset class. Will be set on-demand in the following
         layerElement.classList.remove( 'ax-details-layer-with-source-animation' );

         if( open ) {
            document.addEventListener( 'focus', checkFocus, true );
            document.addEventListener( 'keydown', tabCaptureListener );
            openLayer( sourceElement, skipAnimations );
         }
         else {
            document.removeEventListener( 'focus', checkFocus, true );
            document.removeEventListener( 'keydown', tabCaptureListener );
            closeLayer( sourceElement );
         }
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function checkFocus( event ) {
         let node = event.target;
         while( node !== document.body && node !== layerElement ) {
            node = node.parentNode;
         }
         if( node === document.body ) {
            const nextNode = findFirstOrLast( lastTabWasShifted );
            secureFocus( nextNode );
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function tabCaptureListener( event ) {
         if( event.keyCode === 9 ) {
            lastTabWasShifted = event.shiftKey;
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function findFirstOrLast( useLargest ) {
         const nodes = [].slice.call(
            layerElement.querySelectorAll( 'input,a,button,textarea,select,[tabindex]' )
         );
         if( !nodes.length ) {
            return null;
         }

         return nodes.reduce( ( previousNode, currentNode ) => {

            if( !isFocusable( currentNode ) ) {
               return previousNode;
            }

            const tabIndexCurrent = getTabIndex( currentNode );
            if( tabIndexCurrent < 0 ) {
               return previousNode;
            }
            const tabIndexPrevious = getTabIndex( previousNode );

            const currentIsSmaller = tabIndexCurrent < tabIndexPrevious;
            if( useLargest ) {
               return currentIsSmaller ? previousNode : currentNode;
            }
            return currentIsSmaller ? currentNode : previousNode;
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function getTabIndex( node ) {
            const item = node.attributes.getNamedItem( 'tabindex' );
            return item ? item.value : 0;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function isFocusable( node ) {
            if( node.nodeType !== 1 || node.disabled ) {
               return false;
            }
            const computedStyle = window.getComputedStyle( node );
            if( computedStyle.getPropertyValue( 'display' ) === 'none' ) {
               return false;
            }
            if( computedStyle.getPropertyValue( 'visibility' ) === 'hidden' ) {
               return false;
            }
            return node.offsetParent !== null;
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function secureFocus( node ) {
         try {
            node.focus();
         }
         catch( e ) {
            // ignore exceptions in IE  when focussing hidden DOM nodes
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      cleanUpLayer = () => {
         document.removeEventListener( 'focus', checkFocus, true );
         document.removeEventListener( 'keydown', tabCaptureListener );
         sourceElement = null;
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function openLayer( sourceElement, skipAnimations ) {
         if( sourceElement && !skipAnimations ) {
            const boundingBox = sourceElement.getBoundingClientRect();
            const scaling = boundingBox.width / viewportWidth();
            layerElement.style.height = `${( boundingBox.height / scaling )}px`;
            layerElement.style.transform =
               `translate3d( ${boundingBox.left}px, ${boundingBox.top}px, 0 )` +
               `scale3d( ${scaling}, ${scaling}, 1 ) `;
            layerElement.style.opacity = 0.3;
            layerElement.classList.add( 'ax-details-layer-with-source-animation' );
         }

         backdropElement.style.display = '';
         layerElement.style.display = 'block';

         // eslint-disable-next-line no-unused-expressions
         layerElement.offsetWidth; // Triggering reflow. Otherwise the animation won't work

         // scroll content layer to top:
         if( features.open.resetPosition ) {
            layerElement.querySelector( '.ax-details-layer-content' ).scrollTop = 0;
         }

         if( sourceElement && !skipAnimations ) {
            layerElement.style.height = '';
            layerElement.style.opacity = 1;
            layerElement.style.transform = 'translate3d(0, 0, 0) scale3d( 1, 1, 1)';
            layerElement.addEventListener( 'transitionend', completeOpening );
         }
         else {
            completeOpening( skipAnimations );
         }

         // Issue (#8):
         // For iOS Safari: we need to make the body fixed in order to prevent background scrolling.
         // To maintain the scroll position, we translate the entire page upwards, and move the layer down.
         // Thus we only execute the additional code when the user agent might use the apple webkit engine.
         if( isIosWebKit() ) {
            preventBodyScrolling();
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function completeOpening( skipAnimations ) {
            layerElement.removeEventListener( 'transitionend', completeOpening );

            if( !isOpen ) {
               // the layer was opened and instantly closed again
               return;
            }

            document.body.addEventListener( 'keyup', escapeCloseHandler );
            document.body.classList.add( 'modal-open' );
            layerElement.querySelector( '.ax-details-layer-close-button' )
               .addEventListener( 'keyup', escapeCloseHandler );

            if( skipAnimations ) {
               backdropElement.style.transition = 'none';
               // eslint-disable-next-line no-unused-expressions
               backdropElement.offsetWidth; // Triggering reflow for the disabled transition
            }
            backdropElement.classList.add( 'ax-details-layer-open' );
            layerElement.classList.remove( 'ax-details-layer-with-source-animation' );
            updateContentAreaVisibility( true );
            if( skipAnimations ) {
               backdropElement.style.transition = '';
            }
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function closeLayer( sourceElement ) {
         if( isIosWebKit() ) {
            restoreBodyScrolling();
         }

         backdropElement.classList.remove( 'ax-details-layer-open' );

         document.body.removeEventListener( 'keyup', escapeCloseHandler );
         document.body.classList.remove( 'modal-open' );

         if( sourceElement ) {
            layerElement.classList.add( 'ax-details-layer-with-source-animation' );

            const boundingBox = sourceElement.getBoundingClientRect();
            const scaling = boundingBox.width / viewportWidth();
            layerElement.style.height = `${( boundingBox.height / scaling )}px`;
            layerElement.style.opacity = 0;
            layerElement.style.transform =
               `translate3d( ${boundingBox.left}px, ${boundingBox.top}px, 0 )` +
               `scale3d( ${scaling}, ${scaling}, 1 ) `;
            layerElement.addEventListener( 'transitionend', completeClosing );
         }
         else {
            completeClosing();
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         function completeClosing() {
            layerElement.removeEventListener( 'transitionend', completeClosing );

            if( isOpen ) {
               // the layer was closed and instantly opened again
               return;
            }

            layerElement.classList.remove( 'ax-details-layer-with-source-animation' );
            layerElement.style.display = 'none';
            layerElement.style.transform = '';
            layerElement.style.opacity = '';
            layerElement.style.height = '';
            backdropElement.style.display = 'none';

            updateContentAreaVisibility( false );
            closeActionPublisher();
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function preventBodyScrolling() {
         // Following body scroll prevention taken from here:
         // https://github.com/luster-io/prevent-overscroll
         contentElement.addEventListener( 'touchstart', handleContentTouchStart );
         contentElement.addEventListener( 'touchmove', handleContentTouchMove );

         document.body.addEventListener( 'touchmove', handleBodyTouchMove );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function restoreBodyScrolling() {
         contentElement.addEventListener( 'touchstart', handleContentTouchStart );
         contentElement.addEventListener( 'touchmove', handleContentTouchMove );

         document.body.removeEventListener( 'touchmove', handleBodyTouchMove );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function handleContentTouchStart() {
         const top = contentElement.scrollTop;
         const totalScroll = contentElement.scrollHeight;
         const currentScroll = top + contentElement.offsetHeight;

            // If we're at the top or the bottom of the containers scroll, push up or down one pixel.
            // This prevents the scroll from "passing through" to the body.
         if( top === 0 ) {
            contentElement.scrollTop = 1;
         }
         else if( currentScroll === totalScroll ) {
            contentElement.scrollTop = top - 1;
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function handleContentTouchMove( event ) {
         const contentElement = layerElement.querySelector( '.ax-details-layer-content' );
            // If the content is actually scrollable, i.e. the content is long enough
            // that scrolling can occur
         if( contentElement.offsetHeight < contentElement.scrollHeight ) {
            event.originalEvent._isDetailsLayer = true;
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function handleBodyTouchMove( event ) {
            // In this case, the default behavior is scrolling the body, which
            // would result in an overflow. Since we don't want that, we preventDefault.
         if( !event._isDetailsLayer ) {
            event.preventDefault();
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function viewportWidth() {
         return Math.max( document.documentElement.clientWidth, window.innerWidth || 0 );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function isIosWebKit() {
         const isTouch = !!( 'ontouchstart' in window || navigator.maxTouchPoints );
         return isTouch && navigator.userAgent.match( /AppleWebKit/ );
      }
   }
}
