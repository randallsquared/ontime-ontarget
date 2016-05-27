# ontime-ontarget

> The API call scheduler you've been waiting for all hour.

ontime-ontarget accepts one-time and recurring HTTP(S) calls and sends them soon after they were scheduled to be sent.

It is far from complete or production ready, but could be used now if you really, really need it.

## manage topics

### GET /schedule/topics

lists all topics

### GET /schedule/topics/UUID

shows this topic

### POST /schedule/topics

- name
- description

### PUT /schedule/topics/UUID

- name
- description

### DELETE /schedule/topics/UUID

## subscribe to topics

### GET /schedule/topics/UUID/subscribers

### POST /schedule/topics/UUID/subscribers

- uri
- method

### PUT /schedule/topics/UUID/subscribers/UUID

- uri
- method

### DELETE /schedule/topics/UUID/subscribers/UUID

## schedule one or more events

### POST /schedule/topics/UUID/at/<timespec>

Anything sent in the body is sent when the event fires to the subscribers.  The Content-Type is also parroted to subscribers.

#### timespec

The part of the URI after `...at/` is either a timestamp in ISO-8601 format, or a [recurring interval](https://en.wikipedia.org/wiki/ISO_8601#Repeating_intervals) in ISO-8601 format.  For example, `/schedule/topics/0bc52d28-27cd-42b4-a726-3c0e5ff5ae9f/at/R/2016-05-03T11:22:33/P1D` contains `R/2016-05-03T11:22:33/P1D`, which means starting at 2016-05-03T11:22:33, fire this event every day.  ISO-8601 format is pretty flexible, but cannot do non-regular intervals, so for those you'll need multiple events.

### GET /schedule/topics/UUID/events

lists all future events for this topic, with UUIDs, interval, maybe count of subscribers, maybe all subscribers, maybe data

### GET /schedule/topics/UUID/events/UUID

UUID, topic, interval, data, maybe subscribers, maybe count of subscribers

### DELETE /schedule/topics/UUID/events/UUID

remove this event

## prerequisites

(none of this exists in the code at the moment)

We need a way to set up conditions that must be satisified for the subscriber.  For example, an authentication call may be required to derive authorization to make this call.

- prerequisites have
  - UUID
  - name
  - type
    A type is basically the name of a plugin which does whatever needs doing for this kind of call.  Plugins expose a middleware function which can alter an outgoing request in any way before calling back with the modified request for sending.
  - any number of options which may be required or optional for that prerequisite type

## storage

We're storing in redis.  

### topics

- topic:tUUID hash
  - name
  - description

### subscribers

subscribers are a set, but also have properties other than a single string.

- topic:subscribers:tUUID set
  - sUUID[]

- subscriber:sUUID hash
  - uri
  - method

### events

- events:topic:tUUID set
  - eUUID[]

- event:eUUID hash
  - tUUID
  - interval
  - timestamp
  - next
  - data


- at:<seconds> list
  - eUUID

- eventtimes sorted set
  - at:<seconds>

## TODO

- tests
- hypermedia
- pagination
  - use scan instead of getting everything, for instance
- retries
  - retry only failed subscribers
  - **right now we do nothing but log failures!**
- expiration
  - if the system can't send or otherwise gets behind, when should we just remove this scheduled call?
  - when implemented, this will prevent queued calls, but not prevent rescheduling of recurring calls where future recurrances exist
- tests
- prerequisites
  - see above; this is needed to do OAuth, etc
- configuration
  - right now you can use any redis, as long as it's on localhost at the default port
  - timeouts
  - per topic/event/subscriber retries
- also, we need to have some tests

