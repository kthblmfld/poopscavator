var eventEmitter = new (require('events').EventEmitter)();

function emit(str) {
  'use strict';
  eventEmitter.emit(str);
}

function register(str, callback) {
  'use strict';
  eventEmitter.on(str, callback);
}

exports.emit = emit;
exports.register = register;