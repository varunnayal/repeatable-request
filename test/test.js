const chai = require('chai');
const assign = require('object-assign');
const expect = chai.expect;

const repeatableRequest = require('..');

var repeatableError = { retryable: true, message: 'repeatable' };
var nonRepeatableError = { message: 'Error message' };

function sendRequestHelperWithFn(maxN, beforeFn, afterFn) {
  var n = -1;
  if (typeof beforeFn !== 'function') {
    // Send repeatable error
    beforeFn = function (tryNum, done) { done(assign({tryNum: tryNum}, repeatableError)); }
  }
  if (typeof afterFn !== 'function') {
    // Send success call
    afterFn = function (tryNum, done, args) { done(null, { args: args, tryNum: tryNum }); }
  }
  
  return function(args, done) {
    n += 1;
    if (n <= maxN) {
      return setTimeout(function() { beforeFn(n, done); });
    }
    return setTimeout(function() { afterFn(n, done, args); });
  }
}

describe('Repeatable request', function() {
  this.timeout(5000);
  it('should fail by exhausting retries', function(done) {
    repeatableRequest(
      // Context args
      { sendRequest: sendRequestHelperWithFn(3) },
      // Args
      1,
      // Done
      function (error, data) {
        expect(error).to.deep.equal(assign({ tryNum: 3 }, repeatableError));
        expect(data).to.equal(undefined);
        done();
      }
    );
  });

  it('should retry (n-k) times before succeeding', function(done) {
    var k = 2;
    repeatableRequest(
      // Context args, specifying backoffRange and maxRetryCount as well
      { sendRequest: sendRequestHelperWithFn(k), maxRetryCount: 5, backoffRange: { start: 50, end: 100 } },
      21,
      function (error, data) {
        expect(data).to.deep.equal({ args: 21, tryNum: k + 1 });
        expect(error).to.equal(null);
        done();
      }
    );
  });

  it('should retry (n-k) times before raising non-retryable error', function(done) {
    var k = 4;
    repeatableRequest(
      { maxRetryCount: 10, backoffRange: { start: 50, end: 100 },
        sendRequest: sendRequestHelperWithFn(k, null, function(tryNum, done) {
          return setTimeout(function() { done({ error: 'Error Message', retryable: false, tryNum: tryNum }) });
        })
      },
      24,
      function (error, data) {
        expect(error).to.deep.equal({ error: 'Error Message', retryable: false, tryNum: k + 1 });
        expect(data).to.equal(undefined);
        done();
      }
    );
  });

  it('should succeed in first call', function(done) {
    repeatableRequest(
      { backoffRange: { start: 50, end: 100 },
        sendRequest: sendRequestHelperWithFn(0, function(tryNum, done) { done(null, { args: null, tryNum: tryNum }) }),
      },
      null,
      function (error, data) {
        expect(error).to.equal(null);
        expect(data).to.deep.equal( { args: null, tryNum: 0 });
        done();
      }
    );
  });

  it('should fail with nonretryable error in first call', function(done) {
    var args = 24;
    repeatableRequest(
      { maxRetryCount: 0, backoffRange: { start: 50, end: 100 },
        sendRequest: sendRequestHelperWithFn(0, function(tryNum, done) { done(assign({tryNum: tryNum}, nonRepeatableError)) }),
      },
      args,
      function (error, data) {
        expect(error).to.deep.equal(assign({tryNum: 0}, nonRepeatableError));
        expect(data).to.equal(undefined);
        done();
      }
    );
  });

  it('should use custom retyrable check', function(done) {
    repeatableRequest(
      { maxRetryCount: 10, backoffRange: { start: 50, end: 100 },
        sendRequest: sendRequestHelperWithFn(4, function(tryNum, done) {
          setTimeout(function() { done(null, { shouldIRetry: true }); });
        }),
        // Custom method using data to find out whether request should repeat or not
        isRetryable: function(error, data) {
          return data.shouldIRetry === true;
        }
      },
      11,
      function (error, data) {
        expect(data).to.deep.equal({ tryNum: 5, args: 11 });
        expect(error).to.equal(null);
        done();
      }
    );
  });

  it('should throw error if sendRequest is not passed', function(done) {
    expect(repeatableRequest.bind(null,
      null,
      11,
      function (error, data) {
        expect(data).to.deep.equal({ tryNum: 5, args: 11 });
        expect(error).to.equal(null);
        done();
      }
    )).to.throw('sendRequest is not a function');
    done();
  });

});
