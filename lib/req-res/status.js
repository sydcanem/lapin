'use strict';

const mixins = require( '../util/mixins' );

module.exports = function ( options ) {
	const respond        = options.respond;
	const log            = options.log;

	function reply ( cb ) {
		if ( options.timeout ) {
			// not called or cleared
			/* eslint no-underscore-dangle:0 */
			if ( options.timeout._idlePrev ) {
				clearTimeout( options.timeout );
				cb();
			}
		} else {
			cb();
		}
	}

	return {
		success ( data ) {
			reply( function () {
				respond( {
					data,
					'status' : 'success'
				} );
				setImmediate( function () {
					log.silly( 'success', {
						'data'        : mixins.cloneDeep( data ) || {},
						'messageType' : options.messageType,
						'msg'         : mixins.cloneDeep( options.message ) || {}
					} );
				} );
			} );
		},

		error ( data, errorData, code ) {
			reply( function () {
				respond( {
					'status' : 'error',

					// interchanged because data is optional
					'message' : data,

					// optional
					'data' : errorData || {},

					// optional
					'code' : code || 0
				} );

				setImmediate( function () {
					log.error( 'error', {
						code,
						'data'        : mixins.cloneDeep( errorData ) || {},
						'messageType' : options.messageType,
						'msg'         : mixins.cloneDeep( options.message ) || {},
						'errorMsg'    : data
					} );
				} );
			} );
		},

		fail ( data ) {
			reply( function () {
				respond( {
					data,
					'status' : 'fail'
				} );
				setImmediate( function () {
					log.warn( 'fail', {
						'data'        : mixins.cloneDeep( data ) || {},
						'messageType' : options.messageType,
						'msg'         : mixins.cloneDeep( options.message ) || {}
					} );
				} );
			} );
		}
	};
};
