# repeatable-request

[![Build Status](https://travis-ci.org/varunnayal/repeatable-request.svg?branch=master)](https://travis-ci.org/varunnayal/repeatable-request)
[![Coverage Status](https://coveralls.io/repos/github/varunnayal/repeatable-request/badge.svg?branch=master)](https://coveralls.io/github/varunnayal/repeatable-request?branch=master)
[![Code Climate](https://codeclimate.com/github/varunnayal/repeatable-request/badges/gpa.svg)](https://codeclimate.com/github/codeclimate/codeclimate)

[![dependencies Status](https://david-dm.org/varunnayal/repeatable-request/status.svg)](https://david-dm.org/varunnayal/repeatable-request)
[![devDependencies Status](https://david-dm.org/varunnayal/repeatable-request/dev-status.svg)](https://david-dm.org/varunnayal/repeatable-request?type=dev)

To repeat a request until a condition is met. Used for retrying request whenever a retryable error is raised.

## Installation

```sh
$ npm install --save repeatable-request
```
or with yarn
```sh
$ yarn add --dev repeatable-request
```

## Usage

```javascript
var repeatableRequest = require('repeatable-request');

var sendRequest = function() {
}

// Arguments are: contextArgs, args, done
repeatableRequest({
  sendRequest: sendRequest, // Required
  isRetryable: function (error, data) {
    // You can put any check here, Return true to sendRequest again
    return error.retryable === true;
  },
  backoffRange: {
    start: 200,
    end: 500,
  },
  maxRetryCount: 2,
}, { key: 'arguments passed as first parameter to sendRequest' }, function(error, done) {
  console.log(error, done);
});
```

### Options
Various options can be passed to the first argument of `repeatableRequest`.

#### sendRequest (Required)
Method sending request with callback pattern signature
```javascript
function(args, done);
```

repeatableRequest takes following arguments:
- contextArgs
- args
- done

Out of these *args* and *done* are passed to sendRequest method

#### isRetryable (Optional)
A function in format `function(error, data) {}`. If this method returns true then sendRequest is called again.
Default:
```javascript
function(error) {
  return error && error.retryable === true;
}
```

#### backoffRange { start, end } (Optional)
An object determining minimum and maximum time in milliseconds library should wait before retrying.
Any random value b/w `start` and `end` is used with `setTimeout` function to defer retry execution. 
Default:
```javascript
{ start: 500, end: 1000 }
```
#### maxRetryCount (Optional)
Maximum number of times request can be repeated
Default: 3


### Retry Exhaust
In case of all retries were exhausted, then last error received will be passed to *done* function.
