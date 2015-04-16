'use strict';
var util = require('util'),
    request = require('request'),
    parseString = require('xml2js').parseString;

var SensorLib = require('../../index'),
    Actuator = SensorLib.Actuator,
    logger = Actuator.getLogger();

var foscamCGIInfo = {
  protocol: 'http',
  domain: '',
  path: 'cgi-bin/CGIProxy.fcgi'
};

var foscamCommands = {
  'snapPicture': 'snapPicture2',  // NOTE: use only snapPicture2(return image data) of foscam
  'gotoPresetDefault': 'ptzGotoPresetPoint',
  'resetPosition': 'ptzReset',
  'reboot': 'rebootSystem'
};

var resultCodes = {
  '0': 'Success',
  '-1': 'CGI request string format error',
  '-2': 'Username or password error',
  '-3': 'Access deny',
  '-4': 'CGI execute fail',
  '-5': 'Timeout'
};

function FoscamActuator(sensorInfo, options) {
  Actuator.call(this, sensorInfo, options);

  if (sensorInfo) {
    this.model = sensorInfo.model;
    this.domain = sensorInfo.device.address;
  }
}

FoscamActuator.properties = {
  supportedNetworks: ['foscam'],
  dataTypes: ['camera'],
  discoverable: false,
  addressable: true,
  maxInstances: 5,
  idTemplate: '{model}-{gatewayId}-{deviceAddress}',
  models: ['FI9821WA'],
  commands: ['snapPicture', 'gotoPresetDefault', 'resetPosition', 'reboot'],
  category: 'actuator'
};

util.inherits(FoscamActuator, Actuator);

function executeCommand(command, self, moreQuery, options, cb) {
  var domain, query, url, requestOptions;

  domain = self.domain;

  // TODO: accept user credential from UI or setting
  query = 'cmd=' + foscamCommands[command] + '&usr=foscam&pwd=foscam8910';

  if (moreQuery) {
    query += ('&' + moreQuery);
  }

  url = foscamCGIInfo.protocol + '://' + domain + '/' + foscamCGIInfo.path + '?' + query;

  // if the result is image
  if (command === 'snapPicture') {
    requestOptions = { encoding: null };
  }

  request.get(url, requestOptions, function (err, res, body) {
    logger.info('[FoscamActuator/' + command + ']', err, res && res.status);

    if (err) {
      return cb && cb(err);
    }
    var result;

    if (command === 'snapPicture') { // if the result is image
      result = {
        contentType: 'image/jpeg',
        content: body
      };
      return cb && cb(null, result);
    } 

    parseString(body, function (err, parsedBody) {
      var content, error, rpcError = null;
      if (err) {
        logger.error('[FoscamActuator] JSON parsing error with command response', body, err);
        error = 'JSON Parsing error with command response';
      } else {
        logger.info('[FoscamActuator]', body, parsedBody);

        if (parsedBody['CGI_Result']) {
          if (parsedBody['CGI_Result'].result.toString() === '0') {
            content = resultCodes[parsedBody['CGI_Result'].result.toString()];
          } else {
            error = resultCodes[parsedBody['CGI_Result'].result.toString()] || 'unknown error';
          }
        } else {
          error = 'No CGI Result';
        }
      }
      if (error) {
        /* "JSON-RPC 2.0" Compatible Format for a response(error) : { id: , error: { code:, message: } } */
        rpcError = {};
        rpcError.code = -32000;
        rpcError.message = error.toString();

        logger.error('[FoscamActuator - Command] / error', command, rpcError);
      } else {
        result = {
          contentType: 'text/plain',
          content: content
        };
      }

      return cb && cb(rpcError, result);
    });
  });
}

FoscamActuator.prototype.snapPicture = function (options, cb) {
  executeCommand('snapPicture', this, null, options, cb);
};

FoscamActuator.prototype.gotoPresetDefault = function (options, cb) {
  var query = 'name=default';

  executeCommand('gotoPresetDefault', this, query, options, cb);
};

FoscamActuator.prototype.resetPosition = function (options, cb) {
  executeCommand('resetPosition', this, null, options, cb);
};

FoscamActuator.prototype.reboot = function (options, cb) {
  executeCommand('reboot', this, null, options, cb);
};

FoscamActuator.prototype._clear = function () {
  return;
};

module.exports = FoscamActuator;
