let router = require('express').Router({ mergeParams: true });
let cluster = require('cluster');
let topics = require('./handlers/topics');
let subscribers = require('./handlers/subscribers');
let events = require('./handlers/events');
let bluebird = require('bluebird');
let Redis = require('ioredis');
let redis = new Redis();
let moment = require('moment');
let request = require('request-promise');
let Event = require('./models/event.js');
let Subscriber = require('./models/subscriber.js');

module.exports = router;

let format = promiser => {
  return function (req, res, next) {
    bluebird
      .resolve({ req: req, res: res })
      .then(promiser)
      .then(response => res.status(response.code).send(response.body))
      .catch(next);
  };
};

router.get('/', format(() => 'OK'));

router.get('/topics', format(topics.list));
router.post('/topics', format(topics.create));

router.get('/topics/:topic', format(topics.show));
router.put('/topics/:topic', format(topics.update));
router.delete('/topics/:topic', format(topics.remove));


router.get('/topics/:topic/subscribers', format(subscribers.list));
router.post('/topics/:topic/subscribers', format(subscribers.create));

router.get('/topics/:topic/subscribers/:subscriber', format(subscribers.show));
router.put('/topics/:topic/subscribers/:subscriber', format(subscribers.update));
router.delete('/topics/:topic/subscribers/:subscriber', format(subscribers.remove));

router.get('/topics/:topic/events', format(events.list));
router.post('/topics/:topic/at/*?', format(events.create));

router.get('/topics/:topic/events/:event', format(events.show));
router.delete('/topics/:topic/events/:event', format(events.remove));

let sendRequest = (event, subscriber) => {
  //console.log('about to send subscriber ', subscriber.id, "'s ", subscriber.method, ' ', event.id, ' to ', subscriber.uri);
  let options = {
    uri: subscriber.uri,
    method: subscriber.method,
    body: event.data,
    headers: { 'content-type': event.contentType },
    timeout: 1000,
    time: true
  };
  // need to make sure Promise.map doesn't fail...
  return request(options).catch(err => err);
};

let handleEvent = (event) => {
  Subscriber.find(event.topic)
    .then(subscribers => {
      return bluebird.map(subscribers, subscriber => sendRequest(event, subscriber), {concurrency: 5});
    })
    .then(results => {
      
      if (event.interval) {
        // requeue
        return Event.validateTimespec(event.interval)
          .then(({next}) => {
            event.next = next;
            //console.log('requeueing for ', next, ' from ', event.interval);
            return event.save().then(() => results);
          })
          .catch(err => {
            console.error(err);
            return results;
          });
      } else {
        return event.remove().then(() => results);
      }
    })
    .tap(console.dir)
    .then(() => worker()); // only stop when we're empty
};


let worker = () => {
  //let now = moment().toISOString();
  //console.log(`[${now}] Worker ${cluster.worker.id} looking for pending events...`);
  return Event.pending()
    .then(event => event ? handleEvent(event) : false)
    .catch(err => console.error(err));  
};

// start scheduler worker
if (cluster.isWorker) {
  let timeout = cluster.worker.id * 15000;
  //let now = moment().toISOString();
  //console.log(`[${now}] Setting Worker ${cluster.worker.id} to start in ${timeout}ms`);
  setTimeout(() => {
    //let now = moment().toISOString();
    //console.log(`[${now}] Starting Worker ${cluster.worker.id}`);
    setInterval(worker, 60000)
  }, timeout);
}  
