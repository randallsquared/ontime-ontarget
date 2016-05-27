var bluebird = require('bluebird');
var uuid = require('uuid');
var Redis = require('ioredis');
var redis = new Redis();


let typeKey = id => 'topic:' + id;
let subscribersKey = id => 'subscribers:topic:' + id;
let eventsKey = id => 'events:topic:' + id;

let createTopic = ({req, res}) => {
  let topic = {
    id: uuid.v4(),
    name: req.body.name || '',
    description: req.body.description || ''
  };
  return redis
    .hmset(typeKey(topic.id), topic)
    .then(result => ({ code: 201, body: 'CREATED: '+topic.id }));
};

let updateTopic = ({req, res}) => {
  let topic = {
    id: req.params.topic
  };
  let key = typeKey(topic.id);
  if (req.body.name) {
    topic.name = req.body.name;
  }
  if (req.body.description) {
    topic.description = req.body.description;
  }
  return redis
    .exists(key)
    .then(exists => { 
      if (exists) {
        return redis
          .hmset(key, topic)
          .then(result => ({ code: 200, body: 'UPDATED: '+req.params.topic }));
      } else {
        return { code: 400, body: 'CREATE FIRST: '+req.params.topic };
      }
    });
};

let removeTopic = ({req, res}) => (
  redis
    .del(subscribersKey(req.params.topic), eventsKey(req.params.topic))
    .then(() => redis) // don't care if this succeeded; topic may not have events or subscribers
    .del(typeKey(req.params.topic))
    .then(succeeded => {
      if (succeeded) {
        return { code: 200, body: 'REMOVED: '+req.params.topic };
      } else {
        return { code: 404, body: 'NOT REMOVED: '+req.params.topic };
      }
    })
);

let showTopic = ({req, res}) => {
  let key = typeKey(req.params.topic);
  return redis
    .type(key)
    .then(typename => {
      if (typename === 'hash') {
        return redis
          .hgetall(key)
          .then(topic => {
            return { code: 200, body: JSON.stringify(topic) };
          });
      } else {
        // since we prefix key with topic: we'll always get either 'hash' or 'none'
        return { code: 404, body: 'NO TOPIC: ' + req.params.topic };
      } 
    });
};

// later we'll use scan instead of keys
let listTopics = ({req, res}) => {
  return redis
    .keys(typeKey('*'))
    .then(topics => bluebird.map(topics, topic => redis.hgetall(topic)))
    .then(topics => ({ code: 200, body: JSON.stringify(topics) }));
};

module.exports = {
  create: createTopic,
  update: updateTopic,
  remove: removeTopic,
  show: showTopic,
  list: listTopics
}
