let Subscriber = require('../models/subscriber.js');

let createSubscriber = ({req, res}) => {
  if (!req.body.uri) {
    return { code: 400, body: 'URI REQUIRED' };
  }
  let options = {
    uri: req.body.uri,
    topic: req.params.topic,
    method: req.body.method
  };
  let subscriber = new Subscriber(options);
  return subscriber.save()
    .then(result => ({ code: 201, body: 'CREATED: '+subscriber.id }));
};

let updateSubscriber = ({req, res}) => {
  return Subscriber
    .get(req.params.subscriber)
    .then(subscriber => {
      if (!subscriber) {
        return { code: 400, body: 'CREATE FIRST: ' + req.params.subscriber };
      }
      subscriber.uri = req.body.uri;
      subscriber.method = req.body.method;
      return subscriber.save()
        .then(result => ({ code: 200, body: 'UPDATED: ' + req.params.subscriber }));
    });
};

let removeSubscriber = ({req, res}) => {
  return Subscriber
    .get(req.params.subscriber)
    .then(subscriber => {
      if (!subscriber) {
        return { code: 404, body: 'NOT REMOVED: ' + req.params.subscriber };
      }
      return subscriber
        .remove()
        .then(() => ({ code: 200, body: 'REMOVED: ' + req.params.subscriber }));
    });
};

let showSubscriber = ({req, res}) => {
  return Subscriber
    .get(req.params.subscriber)
    .then(subscriber => subscriber ?
      { code: 200, body: JSON.stringify(subscriber) } :
      { code: 404, body: 'NO SUBSCRIBER: ' + req.params.subscriber });
};

let listSubscribers = ({req, res}) => {
  return Subscriber
    .find(req.params.topic)
    .then(subscribers => ({ code: 200, body: JSON.stringify(subscribers) }));
};

module.exports = {
  create: createSubscriber,
  update: updateSubscriber,
  remove: removeSubscriber,
  show: showSubscriber,
  list: listSubscribers
}
