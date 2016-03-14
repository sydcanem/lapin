'use strict';

var _             = require( 'lodash' );
var util          = require( 'util' );
var Rabbus        = require( 'rabbus' );
var cls           = require( 'continuation-local-storage' );
var trace         = require( 'tryfer' ).trace;
var mixins        = require( '../util/mixins' );
var validate      = require( './validate' );
var requestStatus = require( './status' );
var config        = require( '../config' );
var logger        = require( '../logger' );

/*
	Responder
	@params options
		exchange
		queue
		autoDelete
		routingKey
		limit
		noBatch
 */
function Responder ( options ) {
	var data = mixins.getConsumerOptions( options, 'req-res' );

	if ( data instanceof Error ) {
		throw data;
	}

	// validations
	this.vSchema  = options.validate;
	this.vOptions = options.validateOptions;
	this.logger   = logger( { 'emitter' : this } );

	Rabbus.Responder.call( this, config.rabbit, data );
}

util.inherits( Responder, Rabbus.Responder );

// Instance Methods
// ----------------
Responder.prototype.consume = function ( callback ) {
	var that = this;

	this.handle( function ( message, respond ) {
		function toLowerCaseKeys ( obj, val, key ) {
			obj[ key.toLowerCase() ] = val;
		}

		var tracer = trace.Trace.fromHeaders( that.messageType,
											_.transform( message.headers, toLowerCaseKeys ) );

		tracer.setEndpoint( new trace.Endpoint( '0.0.0.0', 0, that.messageType ) );

		// CLS storage for parent trace headers
		var clsTracer = cls.createNamespace( 'req-res.tracer' );

		tracer.run( function () {
			clsTracer.set( 'trace.headers', tracer.toHeaders() );
			// Remove trace information from headers before Joi validation
			delete message.headers;

			// Record the server receive annotation as soon as possible
			tracer.record( trace.Annotation.serverRecv() );

			var originalRespond = respond;

			function traceRespond () {
				originalRespond.apply( that, arguments );
				tracer.record( trace.Annotation.serverSend() );
			}

			var statusOptions = {
				'log'         : that.logger,
				'messageType' : that.messageType,
				'respond'     : traceRespond,
				'message'     : message,
				'emitter'     : that
			};

			if ( !that.vSchema || that.vSchema === 'undefined' ) {
				// if no validation, invoke callback immediately
				callback( message, requestStatus( statusOptions ) );
			} else {
				// perform validation if there is a validation schema
				validate( {
					'value'   : message,
					'schema'  : that.vSchema,
					'options' : that.vOptions
				} )
				.then( function ( data ) {
					callback( data, requestStatus( statusOptions ) );
				} )
				.catch( function ( error ) {
					tracer.record( trace.Annotation.string( error.message ) );
					// send fail
					respond( {
						'status' : 'fail',
						'data'   : error.message
					} );
				} )
				.finally( function () {
					// By Tryfer convention, and by what finagle does, a SERVER_SEND annotation
					// should be made as soon as a response is sent
					tracer.record( trace.Annotation.serverSend() );
				} );
			}
		} );
	} );

	return this;
};

module.exports = Responder;
