'use strict';
var util = require('util'),
    url = require('url'),
    http = require('http'),
    https = require('https'),
    _ = require('lodash'),
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

function restAgent(rurl, options, cb) {
  var parsedUrl, body, opts, requester;

  if (foscamCGIInfo.protocol === 'http') {
    requester = http;
  } else if (foscamCGIInfo.protocol === 'https') {
    requester = https;
  }

  logger.info('[restAgent] rurl, options', rurl, options);
  if (!requester) {
    logger.warn('[restAgent] requester not ready');
    return cb && cb(new Error('requester not ready'));
  }

  parsedUrl = url.parse(rurl,
    false,  // do not parse QUERY_STRING
    true    // do parse HOST and PATH
  );
  body = JSON.stringify(options.body);
  delete options.body;
  opts = _.cloneDeep(options);

  opts = _.merge(opts, parsedUrl);
  if (!opts.hostname) {
    opts.hostname = parsedUrl.host;
  }
  opts.path = parsedUrl.pathname + (parsedUrl.search ? parsedUrl.search : '');
  logger.info('[restAgent] opts', opts);

  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.headers['Content-Length'] = Buffer.byteLength(body);
  }

  var req = requester.request(opts, function(res) {
    var resBody = [];
    res.on('data', function(chunk) {
      resBody.push(chunk);
    });
    res.on('end', function() {
      var buffer = Buffer.concat(resBody);
      logger.info('[restAgent] req.headers', res.req._headers);
      logger.info('[restAgent] res.headers', res.headers);
      return cb && cb(null, res, buffer);
    });
  });
  if (body) {
    req.write(body);
  }
  req.end();

  req.on('error', function(e) {
    logger.error('[restAgent] REQ error', e, e.stack);
    return cb && cb(e);
  });
}

function executeCommand(command, self, moreQuery, options, cb) {
  var domain, query, url, requestOptions, requester;

  domain = self.domain;

  // TODO: accept user credential from UI or setting
  query = 'cmd=' + foscamCommands[command] + '&usr=foscam&pwd=foscam8910';

  if (moreQuery) {
    query += ('&' + moreQuery);
  }

  url = foscamCGIInfo.protocol + '://' + domain + '/' + foscamCGIInfo.path + '?' + query;

  // if the result is image
  if (command === 'snapPicture') {
    requestOptions = { encoding: null, method: 'GET' };
  }

  restAgent(url, requestOptions, function (err, res, body) {
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
