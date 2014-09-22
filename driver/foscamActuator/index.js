'use strict';
var util = require('util'),
    _ = require('lodash'),
    request = require('request'),
    parser = require('xml2json');

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
  0: 'Success',
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
  maxInstances: 5,
  models: ['FI9821WA'],
  commands: ['snapPicture', 'gotoPresetDefault', 'resetPosition', 'reboot']
};

util.inherits(FoscamActuator, Actuator);

function executeCommand(command, self, moreQuery, options, cb) {
  var domain, query, url, requestOptions;

  domain = self.domain;

  // TODO: accept user credential from UI or setting
  query = 'cmd=' + foscamCommands[command] + '&usr=daliworks&pwd=dali123';

  if (moreQuery) {
    query += ('&' + moreQuery);
  }

  url = foscamCGIInfo.protocol + '://' + domain + '/' + foscamCGIInfo.path + '?' + query;

  // if the result is image
  if (command === 'snapPicture') {
    requestOptions = { encoding: null };
  }

  request.get(url, requestOptions,
      function (err, res, body) {
        logger.info('[FoscamActuator/' + command + ']', err, res.status);

        if (err) {
          return cb && cb(err);
        } else {
          var result, parsedBody, content;

          if (command === 'snapPicture') { // if the result is image
            result = {
              returnResult: {
                contentType: 'image/jpeg',
                content: body
              },
              upload: {
                contentType: 'image/jpeg',
                content: body
              }
            };
          } else {
            try {
              parsedBody = JSON.parse(parser.toJson(body));

              logger.info('[FoscamActuator]', body, parsedBody);

              if (parsedBody['CGI_Result']) {
                content = {
                  status: parsedBody['CGI_Result'].result === 0 ? 'ok' : 'error',
                  id: self.id,
                  message: resultCodes[parsedBody['CGI_Result'].result]
                };
              } else {
                content = {
                  status: 'error',
                  id: self.id,
                  message: 'No CGI Result'
                };
              }
            } catch(e) {
              logger.error('[FoscamActuator] JSON parsing error with command response', body, e);
              content = {
                status: 'error',
                id: self.id,
                message: 'JSON Parsing error with command response'
              };
            }

            result = {
              returnResult: {
                contentType: 'text/plain',
                content: content
              }
            };
          }

          return cb && cb(null, result);
        }
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
