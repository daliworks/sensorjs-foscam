'use strict';
var logger = require('log4js').getLogger('Sensor');

function initNetworks() {
  var foscamNetwork;

  try {
    foscamNetwork = require('./network/foscam');
  } catch (e) {
    logger.error('[foscam] init networks error', e);
  }

  return {
    foscam: foscamNetwork
  };
}

function initDrivers() {
  var foscamSensor, foscamActuator;

  try {
    foscamSensor = require('./driver/foscamSensor');
    foscamActuator = require('./driver/foscamActuator');
  } catch(e) {
    logger.error('[foscam] init drivers error', e);
  }

  return {
    foscamSensor: foscamSensor,
    foscamActuator: foscamActuator
  };
}

module.exports = {
  networks: ['foscam'],
  drivers: {
    foscamSensor: ['FI9821WS'],
    foscamActuator: ['FI9821WA']
  },
  initNetworks: initNetworks,
  initDrivers: initDrivers
};
