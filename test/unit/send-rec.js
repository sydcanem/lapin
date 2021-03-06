'use strict';

/* eslint no-unused-expressions:0 */
/* eslint no-underscore-dangle:0 */

const expect  = require( 'chai' ).expect;
const rewire  = require( 'rewire' );
const SendRec = rewire( process.cwd() + '/lib/send-rec' );
const helper  = require( '../helper' );

describe( 'send and receive', function () {
	describe( 'send', function () {
		let Producer, sendRec;

		before( function () {
			sendRec  = new SendRec();
			Producer = SendRec.__get__( 'Sender' );
			SendRec.__set__( 'Sender', helper.Producer );
		} );

		after( function () {
			SendRec.__set__( 'Sender', Producer );
		} );

		it( 'should accept a string', function ( done ) {
			sendRec.send( 'v1.sessions.get', { 'token' : '123' }, function ( data ) {
				expect( data.token ).to.equal( '123' );
				done();
			} );
		} );

		it( 'should accept a object option', function ( done ) {
			sendRec.send( { 'messageType' : 'v1.session.get' }, { 'token' : '123' }, function ( data ) {
				expect( data.token ).to.equal( '123' );
				done();
			} );
		} );
	} );

	describe( 'receive', function () {
		let Consumer, sendRec;

		before( function () {
			sendRec            = new SendRec();
			Consumer           = SendRec.__get__( 'consumer' );

			const consumerHelper = {
				'get' : helper.getNewConsumer
			};

			SendRec.__set__( 'consumer', consumerHelper );
		} );

		after( function () {
			SendRec.__set__( 'consumer', Consumer );
		} );

		it( 'should accept a string', function ( done ) {
			sendRec.receive( 'v1.sessions.get', function ( data ) {
				expect( data ).to.equal( 'done' );
				done();
			} );
		} );

		it( 'should accept a object option', function ( done ) {
			sendRec.receive( { 'messageType' : 'v1.session.get' }, function ( data ) {
				expect( data ).to.equal( 'done' );
				done();
			} );
		} );
	} );
} );

