
let bluebird = require('bluebird');
let uuid = require('uuid');
let Redis = require('ioredis');
let redis = new Redis();

let typeKey = id => 'subscriber:' + id;
let listKey = id => 'subscribers:topic:' + id;

class Subscriber {
  constructor({id, uri, topic, method}) {
    this.id = id || uuid.v4();
    this.uri = uri;
    this.topic = topic;
    this.method = method || 'GET' // really POST is probably more appropriate, but GET is safer
  }

  static get(id) {
    let key = typeKey(id);
    return redis
      .type(key)
      .then(typename => {
        if (typename === 'hash') {
          return redis
            .hgetall(key)
            .then(sub => new Subscriber(sub));
        }
        // since we prefix key with subscriber: we'll always get either 'hash' or 'none'
        return undefined;
      });
  }

  static find(topic) {
    return redis
      .smembers(listKey(topic))
      .then(subs => {
        return bluebird.map(subs, this.get);
      });
  }

  save() {
    return redis
      .hmset(typeKey(this.id), this)
      .then(result => redis.sadd(listKey(this.topic), this.id));
  }

  remove() {
    return redis
      .srem(listKey(this.topic), this.id)
      .then(() => redis.del(typeKey(this.id)));
  }
  
}

module.exports = Subscriber;
