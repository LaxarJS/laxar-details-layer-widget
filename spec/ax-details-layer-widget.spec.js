/**
 * Copyright 2015 LaxarJS
 * Released under the MIT license
 * www.laxarjs.org
 */
define( [
   'json!../widget.json',
   'laxar-mocks',
   'angular-mocks'
], function( descriptor, axMocks, ngMocks ) {
   'use strict';

   describe( 'The ax-details-layer-widget', function() {

      beforeEach( axMocks.createSetupForWidget( descriptor, {
         knownMissingResources: []
      } ) );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      beforeEach( function() {
         axMocks.widget.configure( {
            open: { onActions: [ 'open1', 'open2' ] },
            close: { onActions: [ 'close1', 'close2' ] },
            animateFrom: { actionSelectorPath: 'data.selector' }
         } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      var anyFunc = jasmine.any( Function );
      var registerAreaSpy;
      var widgetDom;
      var widgetEventBus;
      var widgetScope;
      beforeEach( axMocks.widget.load );
      beforeEach( function() {
         registerAreaSpy = jasmine.createSpy( 'registerArea' );
         ngMocks.inject( function( axPageService ) {
            spyOn( axPageService, 'controllerForScope' ).and.callFake( function() {
               return { areas: { register: registerAreaSpy } };
            } );
         } );

         if( widgetDom ) {
            document.body.removeChild( widgetDom );
            document.body.removeChild( document.getElementById( 'the-button' ) );
         }
         widgetDom = axMocks.widget.render();
         document.body.appendChild( widgetDom );
         var button = document.createElement( 'button' );
         button.id = 'the-button';
         document.body.appendChild( button );

         widgetEventBus = axMocks.widget.axEventBus;
         widgetScope = axMocks.widget.$scope;
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      afterEach( axMocks.tearDown );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'subscribes to the configured open actions', function() {
         expect( widgetEventBus.subscribe ).toHaveBeenCalledWith( 'takeActionRequest.open1', anyFunc );
         expect( widgetEventBus.subscribe ).toHaveBeenCalledWith( 'takeActionRequest.open2', anyFunc );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'subscribes to for the configured close actions', function() {
         expect( widgetEventBus.subscribe ).toHaveBeenCalledWith( 'takeActionRequest.close1', anyFunc );
         expect( widgetEventBus.subscribe ).toHaveBeenCalledWith( 'takeActionRequest.close2', anyFunc );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'is initially closed', function() {
         expect( widgetScope.model.isOpen ).toBe( false );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'when the open action is received', function() {

         try {
            /*jshint -W031:false */
            new window.TransitionEvent( 'change' );
         }
         catch( e ) {
            it( 'the current browser does not support DOM Level 4 events', function() {
               window.console.log( 'The current browser does not support DOM Level 4 events.' );
               window.console.log( 'There won\'t be any hacky workarounds for legacy apis here.' );
               expect( true ).toBe( true );
            } );
            return;
         }

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         beforeEach( function() {
            axMocks.eventBus.publish( 'takeActionRequest.open1', {
               action: 'open1',
               data: {
                  selector: '#the-button'
               }
            } );
            axMocks.eventBus.flush();
            // fake transition being finished
            widgetDom.querySelector( '.abp-details-layer' )
               .dispatchEvent( new window.TransitionEvent( 'transitionend' ) );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'sets the layer to open', function() {
            expect( widgetScope.model.isOpen ).toBe( true );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'publishes a didChangeVisibilityEvent for the area', function() {
            expect( widgetEventBus.publish ).toHaveBeenCalledWith( 'didChangeAreaVisibility.content.true', {
               area: 'content',
               visible: true
            } );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'reads the source element selector from the event', function() {
            expect( widgetScope.model.sourceElementSelector ).toEqual( '#the-button' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'by default cannot be closed by a close icon', function() {
            expect( widgetDom.querySelector( 'button' ) ).toEqual( null );
            widgetScope.functions.closeViaCloseIcon();

            expect( widgetScope.model.isOpen ).toBe( true );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'adds a bootstrap css class on the body element', function() {
            expect( [].slice.call( document.body.classList ) ).toContain( 'modal-open' );
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         describe( 'and again a close action is received', function() {

            beforeEach( function() {
               axMocks.eventBus.publish( 'takeActionRequest.close2', { action: 'close2' } );
               axMocks.eventBus.flush();
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'sets the layer to closed', function() {
               expect( widgetScope.model.isOpen ).toBe( false );
            } );

            //////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'publishes a didChangeVisibilityEvent for the area', function() {
               expect( widgetEventBus.publish ).toHaveBeenCalledWith( 'didChangeAreaVisibility.content.false', {
                  area: 'content',
                  visible: false
               } );
            } );

            /////////////////////////////////////////////////////////////////////////////////////////////////////

            it( 'removes the bootstrap css class on the body element', function() {
               expect( [].slice.call( document.body.classList ) ).not.toContain( 'modal-open' );
            } );

         } );

      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'if configured to be closeable by close icon and then opened', function() {

         beforeEach( function() {
            axMocks.widget.configure( 'closeIcon.enabled', true );
         } );

         beforeEach( axMocks.widget.load );
         beforeEach( function() {
            widgetEventBus = axMocks.widget.axEventBus;
            widgetScope = axMocks.widget.$scope;

            axMocks.eventBus.publish( 'takeActionRequest.open1', { action: 'open1' } );
            axMocks.eventBus.flush();
         } );

         /////////////////////////////////////////////////////////////////////////////////////////////////////

         it( 'it is closed when activating the close icon', function() {
            widgetScope.functions.closeViaCloseIcon();

            expect( widgetScope.model.isOpen ).toBe( false );
         } );

      } );

   } );

} );
