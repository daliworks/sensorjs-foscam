'use strict';
var util = require('util'),
    _ = require('lodash');

var SensorLib = require('../../index'),
    Sensor = SensorLib.Sensor,
    logger = Sensor.getLogger();

function FoscamSensor(sensorInfo, options) {
  Sensor.call(this, sensorInfo, options);
  if (sensorInfo.model) {
    this.model = sensorInfo.model;
  }

  logger.debug('FoscamSensor', sensorInfo);
}

FoscamSensor.properties = {
  supportedNetworks: ['foscam'],
  dataTypes: ['camera'],
  onChange: false,
  discoverable: false,
  recommendedInterval: 60000,
  maxInstances: 1,
  models: ['FI9821WS']
};

util.inherits(FoscamSensor, Sensor);

FoscamSensor.prototype._clear = function () {
  return;
};

module.exports = FoscamSensor;
