// @see: https://gist.github.com/branneman/8048520
require('app-module-path').addPath(__dirname + '/lib');

var server = require('nodebootstrap-server')
  , appConfig = require('./appConfig')
  , app    = require('express')();

/**
 * Setting up sensible default configurations
 *
 * We need to override nodebootstrap-server's version of this so that we can
 * get raw body bytes for event creation, but keep all the default handling
 * for every other route.  This seems somewhat hacky, but I'm not sure how
 * else prevent bodyParser from doing its thing on incoming bodies.
 * 
 * @param initapp optional. You can pass-in the app that should be configured.
 */
module.exports.setAppDefaults = function(initapp) {
  
  var someapp = initapp || express();

  // var root_dir = require('path').dirname(module.parent.filename);
  var root_dir = require('path').dirname(require.main.filename);
  var bodyParser = require('body-parser');
  var urlencodedParser = bodyParser.urlencoded({ extended: true });
  var jsonParser = bodyParser.json({ type: 'application/*+json' });
  var textParser = bodyParser.text({ type: 'text/plain' });
  var rawParser = bodyParser.raw({ type: '*' });
  var multipartParser = require('connect-multiparty')();
  someapp.use(function (req, res, next) {
    if (req.path.indexOf('/at/') > -1) {
      let data = '';
      req.setEncoding('binary');
      req.on('data', function(chunk) {
        data += chunk;
      });
      req.on('end', function() {
        req.rawBody = data;
        next();
      });
    } else {
      urlencodedParser(req, res,
        () => jsonParser(req, res,
          () => textParser(req, res,
            () => rawParser(req, res,
              () => multipartParser(req, res, next)))));
    }  
  });
  someapp.use(require('method-override')('X-HTTP-Method-Override'));

  if (typeof initapp === 'undefined') return someapp;
}

server.setup(app, appConfig.setup);
