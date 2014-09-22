'use strict';

var util = require('util'),
    _ = require ('lodash');

var Network = require('../../index').Network;

function Foscam(options) {
  Network.call(this, 'foscam', options);
}

util.inherits(Foscam, Network);

Foscam.prototype.getDevice = function (addr, options, cb) {
  if (typeof options === 'function') {
    cb = options;
  }

  return cb && cb();
};

Foscam.prototype.discover = function (driverOrModel, cb) {
  return cb && cb();
};

module.exports = new Foscam();
