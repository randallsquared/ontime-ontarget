let bluebird = require('bluebird');
let uuid = require('uuid');
let navigator = require('iso8601-navigate');
let moment = require('moment');
let Redis = require('ioredis');
let redis = new Redis();

const QUEUE_QUEUE_NAME = 'eventtimes';
let typeKey = id => 'event:' + id;
let listKey = id => 'events:topic:' + id;
let atKey = seconds => 'at:' + seconds;

class Event {
  constructor({id, next, topic, interval, timestamp, data, contentType}) {
    this.id = id || uuid.v4();
    this.next = next;
    this.topic = topic;
    if (data !== undefined) {
      this.data = data;
    }
    if (interval !== undefined) {
      this.interval = interval;
    }
    if (timestamp !== undefined) {
      this.timestamp = timestamp;
    }
    if (contentType !== undefined) {
      this.contentType = contentType;
    }
  }
  
  static  validateTimespec(timespec) {
    return bluebird.resolve(timespec)
      .then(timespec => {
        let next = NaN;
        let timestamp = moment(timespec, moment.ISO_8601);
        if (timestamp.isValid()) {
          if (timestamp.isAfter()) {
            next = timestamp.unix();
          } else {
            throw new Error(`Time specification is in the past: ${timespec}`);
          }
        } else {
          let nav = navigator(timespec);
          next = nav.next();
          if (isNaN(next) && isNaN(nav.prev())) {
            throw new Error(`Invalid ISO-8601 interval specification: ${timespec}`);
          } else if (isNaN(next)) {
            throw new Error(`ISO-8601 interval specification's last recurrence is in the past: ${timespec}`);
          }
        }
        return { next: next, timespec: timespec, isInterval: !timestamp.isValid() };
      });
  }

  static getSlim(id) {
    let justFields = ['id', 'topic', 'contentType', 'next', 'interval', 'timestamp'];
    let key = typeKey(id);
    return redis
      .type(key)
      .then(typename => {
        if (typename === 'hash') {
          return redis
            .hmget(key, ...justFields)
            .then(event => {
              let options = {};
              justFields.forEach((field, index) => options[field] = event[index]);
              return new Event(options);
            });
        }
        // since we prefix key with event: we'll always get either 'hash' or 'none'
        return undefined;
      });
  }

  static get(id) {
    let key = typeKey(id);
    return redis
      .type(key)
      .then(typename => {
        if (typename === 'hash') {
          return redis
            .hgetall(key)
            .then(event => new Event(event));
        }
        // since we prefix key with event: we'll always get either 'hash' or 'none'
        return undefined;
      });
  }

  static find(topic) {
    return redis
      .smembers(listKey(topic))
      .then(events => {
        return bluebird.map(events, this.getSlim);
      });
  }

  static pending(until=moment().unix()) {
    return redis
      .zrangebyscore(QUEUE_QUEUE_NAME, 0, until, 'limit', 0, 1)
      .then(queue => { 
        if (!queue.length) {
          return undefined;
        }
        
        return redis
          .lpop(queue)
          .then(id => {
            if (id) {
              return this.get(id);
            } else {
              // empty queue; remove from zset
              return redis
                .zrem(QUEUE_QUEUE_NAME, queue)
                .then(() => this.pending(until));
            }
          });
      });
  }

  save() {
    return redis
      .hmset(typeKey(this.id), this)
      .then(result => redis.sadd(listKey(this.topic), this.id))
      .then(result => redis.rpush(atKey(this.next), this.id))
      .then(result => redis.zadd(QUEUE_QUEUE_NAME, this.next, atKey(this.next)));
  }

  remove() {
    return redis
      .srem(listKey(this.topic), this.id)
      .then(result => redis.lrem(atKey(this.next), this.id, 0))
      .then(() => redis.del(typeKey(this.id)));
  }
  
}

module.exports = Event;

