'use strict';

const env = process.env;

module.exports = {
	'connection' : {
		'server'  : 'rabbitmq',
		'port'    : 5672,
		'portAPI' : 15672,
		'vhost'   : '/',
		'user'    : env.RABBITMQ_USERNAME || 'guest',
		'pass'    : env.RABBITMQ_PASSWORD || 'guest'
	}
};
