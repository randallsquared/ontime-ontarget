require('app-module-path').addPath(__dirname + '/lib');

exports.setup = function(runningApp, callback) {
  // Nothing ever comes from "x-powered-by", but a security hole
  runningApp.disable("x-powered-by");

  //---- Mounting well-encapsulated application modules (so-called: "mini-apps")
  //---- See: http://expressjs.com/guide/routing.html and http://vimeo.com/56166857

  // API endpoint attached to root route:
  runningApp.use('/', require('homedoc')); // attach to root route
  runningApp.use('/schedule', require('schedule'));

  // If you need websockets:
  // var socketio = require('socket.io')(runningApp.http);
  // require('fauxchatapp')(socketio);

  if(typeof callback === 'function') {
    callback(runningApp);
  }
};
