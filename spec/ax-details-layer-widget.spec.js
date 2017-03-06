/**
 * Copyright 2015-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import * as axMocks from 'laxar-mocks';
import * as ng from 'angular';
import 'angular-mocks';

const anyFunc = jasmine.any( Function );
const transitionDurationMs = 1;

describe( 'The ax-details-layer-widget', () => {

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
   let widgetScope;
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
         widgetScope = axMocks.widget.$scope;
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

      it( 'is initially closed', () => {
         expect( widgetScope.model.isOpen ).toBe( false );
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
            axMocks.eventBus.flush();
            awaitTransition( widgetDom.querySelector( '.ax-details-layer' ) ).then( done );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'sets the layer to open', () => {
            expect( widgetScope.model.isOpen ).toBe( true );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'reads the source element selector from the event', () => {
            expect( widgetScope.model.sourceElementSelector ).toEqual( '#the-button' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'by default cannot be closed by a close icon', () => {
            expect( widgetDom.querySelector( 'button' ) ).toEqual( null );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'adds a bootstrap css class on the body element', () => {
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
               axMocks.eventBus.flush();
               awaitTransition( widgetDom.querySelector( '.ax-details-layer' ) ).then( done );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'sets the layer to closed', () => {
               expect( widgetScope.model.isOpen ).toBe( false );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'removes the bootstrap css class on the body element', () => {
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

         let ngElementPrototype;
         beforeEach( done => {
            ngElementPrototype = Object.getPrototypeOf( ng.element( widgetDom ) );
            spyOn( ngElementPrototype, 'css' ).and.callThrough();

            axMocks.eventBus.publish( 'takeActionRequest.open1', {
               action: 'open1',
               data: {
                  selector: '#the-button',
                  skipAnimations: true
               }
            } );
            axMocks.eventBus.flush();
            window.setTimeout( done, 100 );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'disables animations for the layer itself', () => {
            expect( widgetDom.querySelector( '.ax-details-layer' ).classList )
               .not.toContain( 'ax-details-layer-with-source-animation' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'disables transitions on the modal-backdrop', () => {
            expect( ngElementPrototype.css ).toHaveBeenCalledWith( 'transition', 'none' );
            expect( widgetDom.querySelector( '.modal-backdrop' ).classList ).not.toContain( 'fade' );
         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when a didNavigate event is received', () => {

         describe( 'without the configured place parameter', () => {

            beforeEach( () => {
               axMocks.eventBus.publish( 'didNavigate._self', {} );
               axMocks.eventBus.flush();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'does not open the layer', () => {
               expect( widgetScope.model.isOpen ).toBe( false );
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
               expect( widgetScope.model.isOpen ).toBe( false );
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
               expect( widgetScope.model.isOpen ).toBe( true );
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
         widgetScope = axMocks.widget.$scope;

         axMocks.eventBus.publish( 'takeActionRequest.open1', { action: 'open1' } );
         axMocks.eventBus.flush();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'it is closed when activating the close icon', () => {
         widgetScope.functions.close();

         expect( widgetScope.model.isOpen ).toBe( false );
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
         widgetScope = axMocks.widget.$scope;

         axMocks.eventBus.publish( 'takeActionRequest.open1', { action: 'open1' } );
         axMocks.eventBus.flush();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'it is closed when clicking the modal backdrop', () => {
         widgetScope.functions.backdropClicked();

         expect( widgetScope.model.isOpen ).toBe( false );
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
         widgetScope = axMocks.widget.$scope;

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
      return new Promise( done => {
         element.addEventListener( 'transitionend', handle );
         function handle() {
            element.addEventListener( 'transitionend', handle );
            done();
         }
      } );
   }

} );
