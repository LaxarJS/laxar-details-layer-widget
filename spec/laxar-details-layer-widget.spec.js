/**
 * Copyright 2015-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import * as axMocks from 'laxar-mocks';

const anyFunc = jasmine.any( Function );
const transitionDurationMs = 10;

describe( 'The laxar-details-layer-widget', () => {

   beforeEach( axMocks.setupForWidget() );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   beforeEach( () => {

      axMocks.widget.configure( {
         open: { onActions: [ 'open1', 'open2' ] },
         close: {
            onActions: [ 'close1', 'close2' ],
            action: 'afterClose'
         },
         animateFrom: { actionSelectorPath: 'data.selector' },
         skipAnimations: { actionSelectorPath: 'data.skipAnimations' },
         navigation: {
            parameterName: 'thePlace',
            parameterValue: 'testContent'
         }
      } );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   afterEach( axMocks.tearDown );

   let widgetDom;
   let widgetEventBus;
   describe( 'when loaded', () => {

      beforeEach( axMocks.widget.load );
      beforeEach( () => {
         widgetDom = axMocks.widget.render();
         const widgetNodes = [].slice.call( widgetDom.querySelectorAll( '*' ) );
         widgetNodes.forEach( element => {
            element.style[ 'transition-duration' ] = `${transitionDurationMs}ms`;
         } );
         const button = document.createElement( 'button' );
         button.id = 'the-button';
         document.body.appendChild( button );

         widgetEventBus = axMocks.widget.axEventBus;
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      afterEach( () => {
         document.body.classList.remove( 'modal-open' );
         const button = document.querySelector( '#the-button' );
         if( button ) {
            button.parentNode.removeChild( button );
         }
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'subscribes to the configured open actions', () => {
         expect( widgetEventBus.subscribe ).toHaveBeenCalledWith( 'takeActionRequest.open1', anyFunc );
         expect( widgetEventBus.subscribe ).toHaveBeenCalledWith( 'takeActionRequest.open2', anyFunc );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'subscribes to for the configured close actions', () => {
         expect( widgetEventBus.subscribe ).toHaveBeenCalledWith( 'takeActionRequest.close1', anyFunc );
         expect( widgetEventBus.subscribe ).toHaveBeenCalledWith( 'takeActionRequest.close2', anyFunc );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when the open action is received, and the animation is complete', () => {

         beforeEach( done => {
            axMocks.eventBus.publish( 'takeActionRequest.open1', {
               action: 'open1',
               data: {
                  selector: '#the-button'
               }
            } );

            awaitTransition( widgetDom.querySelector( '.ax-details-layer' ) ).then( done );
            axMocks.eventBus.flush();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'by default cannot be closed by a close icon', () => {
            expect( widgetDom.querySelector( 'button' ).style.display ).toEqual( 'none' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'adds a bootstrap CSS class on the body element', () => {
            expect( [].slice.call( document.body.classList ) ).toContain( 'modal-open' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'publishes a navigateRequest event for the configured place parameter', () => {
            expect( widgetEventBus.publish ).toHaveBeenCalledWith( 'navigateRequest._self', {
               target: '_self',
               data: {
                  thePlace: 'testContent'
               }
            } );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'and again a close action is received, and the animation is complete', () => {

            beforeEach( done => {
               axMocks.eventBus.publish( 'takeActionRequest.close2', { action: 'close2' } );

               awaitTransition( widgetDom.querySelector( '.ax-details-layer' ) ).then( done );
               axMocks.eventBus.flush();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'removes the bootstrap CSS class on the body element', () => {
               expect( [].slice.call( document.body.classList ) ).not.toContain( 'modal-open' );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'publishes the close action', () => {
               expect( widgetEventBus.publishAndGatherReplies )
                  .toHaveBeenCalledWith( 'takeActionRequest.afterClose', {
                     action: 'afterClose'
                  }, jasmine.any( Object ) );
            } );

         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when the open action with truthy skipAnimations is received', () => {

         beforeEach( done => {
            axMocks.eventBus.publish( 'takeActionRequest.open1', {
               action: 'open1',
               data: {
                  selector: '#the-button',
                  skipAnimations: true
               }
            } );

            window.setTimeout( done, 100 );
            axMocks.eventBus.flush();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'disables animations for the layer itself', () => {
            expect( widgetDom.querySelector( '.ax-details-layer' ).classList )
               .not.toContain( 'ax-details-layer-with-source-animation' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'disables transitions on the modal-backdrop', () => {
            expect( widgetDom.querySelector( '.modal-backdrop' ).style.transition ).toEqual( '' );
            expect( widgetDom.querySelector( '.modal-backdrop' ).classList ).not.toContain( 'fade' );
         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when a didNavigate event is received', () => {

         let detailsLayer;
         beforeEach( () => {
            detailsLayer = widgetDom.querySelector( '.ax-details-layer' );
         } );

         describe( 'without the configured place parameter', () => {

            beforeEach( () => {
               axMocks.eventBus.publish( 'didNavigate._self', {} );
               axMocks.eventBus.flush();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'does not open the layer', () => {
               expect( detailsLayer.style.display ).toEqual( 'none' );
            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'matching the configured place parameter, but not the value', () => {

            beforeEach( () => {
               axMocks.eventBus.publish( 'didNavigate._self', {
                  data: { thePlace: 'otherContent' }
               } );
               axMocks.eventBus.flush();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'does not open the layer', () => {
               expect( detailsLayer.style.display ).toEqual( 'none' );
            } );

         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'matching the configured place parameter and value', () => {

            beforeEach( () => {
               axMocks.eventBus.publish( 'didNavigate._self', {
                  data: { thePlace: 'testContent' }
               } );
               axMocks.eventBus.flush();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'opens the layer', () => {
               expect( detailsLayer.style.display ).not.toEqual( 'none' );
            } );

         } );

      } );

   } );


   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'if configured to be closeable by close icon and then opened', () => {

      beforeEach( () => {
         axMocks.widget.configure( 'closeIcon.enabled', true );
      } );

      beforeEach( axMocks.widget.load );
      beforeEach( () => {
         widgetEventBus = axMocks.widget.axEventBus;

         axMocks.eventBus.publish( 'takeActionRequest.open1', { action: 'open1' } );
         axMocks.eventBus.flush();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'it is closed when activating the close icon', () => {
         widgetDom.querySelector( '.ax-details-layer-close-button' ).click();

         expect( document.body.classList ).not.toContain( 'modal-open' );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'if configured to be closeable by backdrop click and then opened', () => {

      beforeEach( () => {
         axMocks.widget.configure( 'backdropClose.enabled', true );
      } );

      beforeEach( axMocks.widget.load );
      beforeEach( () => {
         widgetEventBus = axMocks.widget.axEventBus;

         axMocks.eventBus.publish( 'takeActionRequest.open1', { action: 'open1' } );
         axMocks.eventBus.flush();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'it is closed when clicking the modal backdrop', () => {
         widgetDom.querySelector( '.modal-backdrop' ).click();

         expect( document.body.classList ).not.toContain( 'modal-open' );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'with configured log tag feature', () => {

      beforeEach( () => {
         axMocks.widget.configure( 'logTag.name', 'PPUP' );
         axMocks.widget.configure( 'logTag.value', 'registration' );
      } );

      beforeEach( axMocks.widget.load );
      beforeEach( () => {
         widgetEventBus = axMocks.widget.axEventBus;

         axMocks.eventBus.publish( 'takeActionRequest.open1', { action: 'open1' } );
         axMocks.eventBus.flush();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'sets the log tag when openend', () => {
         expect( axMocks.widget.axLog.setTag ).toHaveBeenCalledWith( 'PPUP', 'registration' );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when closed again', () => {

         beforeEach( () => {
            axMocks.eventBus.publish( 'takeActionRequest.close2', { action: 'close2' } );
            axMocks.eventBus.flush();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'removes the log tag', () => {
            expect( axMocks.widget.axLog.removeTag ).toHaveBeenCalledWith( 'PPUP' );
         } );

      } );

   } );

   function awaitTransition( element ) {
      return new Promise( resolve => {
         element.addEventListener( 'transitionend', handle );
         function handle() {
            element.removeEventListener( 'transitionend', handle );
            // TODO: We should find a better way to make sure transitions have ended and tests can continue.
            setTimeout( resolve, 100 );
         }
      } );
   }

} );
