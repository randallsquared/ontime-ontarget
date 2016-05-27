let Event = require('../models/event.js');

let createEvent = ({req, res}) => {
  if (!req.params[0]) {
    return { code: 400, body: 'INTERVAL OR TIME REQUIRED' };
  }
  return Event.validateTimespec(req.params[0])
    .then(({next, timespec, isInterval}) => {
      let contentType = req.get('content-type');
      let body = req.rawBody;
      let options = {
        next: next,
        topic: req.params.topic
      };
      
      if (isInterval) {
        options.interval = timespec;
      } else {
        options.timestamp = timespec;
      }
      if (contentType) {
        options.contentType = contentType;
      }
      if (body !== undefined) {
        options.data = body;
      }

      let event = new Event(options);
      return event.save().then(() => ({ code: 201, body: 'CREATED: ' + event.id }));
    })
    .catch(err => ({ code: 400, body: err.message}));
};

let removeEvent = ({req, res}) => {
  return Event
    .get(req.params.event)
    .then(event => {
      if (!event) {
        return { code: 404, body: 'NOT REMOVED: ' + req.params.event };
      }
      return event
        .remove()
        .then(() => ({ code: 200, body: 'REMOVED: ' + req.params.event }));
    });
};

let showEvent = ({req, res}) => {
  return Event
    .get(req.params.event)
    .then(event => event ?
      { code: 200, body: JSON.stringify(event) } :
      { code: 404, body: 'NO EVENT: ' + req.params.event });
};

let listEvents = ({req, res}) => {
  return Event
    .find(req.params.topic)
    .then(events => ({ code: 200, body: JSON.stringify(events) }));
};

module.exports = {
  create: createEvent,
  remove: removeEvent,
  show: showEvent,
  list: listEvents
}
