'use strict';

var util    = require( 'util' );
var Rabbus  = require( 'rabbus' );
var cls     = require( 'continuation-local-storage' );
var trace   = require( 'tryfer' ).trace;
var mixins  = require( '../util/mixins' );
var config  = require( '../config' );
var logger  = require( '../logger' );
var replies = require( '../util/replies' );

/*
	Requester
	@ params options ( below for requester )
		exchange
		messageType
		autoDelete
		routingKey
		forceAck
 */
function Requester ( options ) {
	var data = mixins.getProducerOptions( options, 'req-res' );

	if ( data instanceof Error ) {
		this.error = data;
	} else {
		this.messageType = options.messageType;
	}

	this.logger = logger( { 'emitter' : this } );

	Rabbus.Requester.call( this, config.rabbit, data );
}

util.inherits( Requester, Rabbus.Requester );

// Instance Methods
// ----------------
Requester.prototype.produce = function ( message, callback ) {
	if ( this.error ) {
		return replies.errorOptions( callback, this, message );
	}

	if ( !message ) {
		return replies.invalidData( callback, this, message );
	}

	var clsTracer = cls.getNamespace( 'req-res.tracer' );
	var tracer;

	if ( clsTracer && clsTracer.get( 'trace.headers' ) ) {
		tracer = new trace.Trace( this.messageType || null, clsTracer.get( 'trace.headers' ) )
			.child( this.messageType );
	} else {
		tracer = new trace.Trace( this.messageType || null );
	}

	// Record the URI and send out a CLIENT_SEND annotation before actually making the request
	tracer.record( trace.Annotation.clientSend() );
	// Adding trace information as headers in message
	message.headers = tracer.toHeaders();

	this.request( message, function ( response ) {
		var error = null;

		// by Tryfer convention, and by what finagle does, a CLIENT_RECV annotation
		// should be made as soon as a response is returned
		tracer.record( trace.Annotation.clientRecv() );

		if ( response.status !== 'success' ) {
			if ( response.toString() === '[object Object]' ) {
				tracer.record( trace.Annotation.string( 'error', JSON.stringify( response ) ) );
			} else {
				tracer.record( trace.Annotation.string( 'error', response.toString() ) );
			}

			error    = response;
			response = null;
		}

		callback( error, response );
	} );

	return this;
};

module.exports = Requester;
