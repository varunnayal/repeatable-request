'use strict'

/**
 * Default value of Maximum retry count
* @type Number
 */
var DEFAULT_RETRY_MAX_COUNT = 3;

/**
* Default value of minimum milliseconds to wait before retrying request
* @type Number
*/
var DEFAULT_RETRY_BACKOFF_MIN_MS = 500;

/**
* Default value of maximum milliseconds to wait before retrying request
* @type Number
*/
var DEFAULT_RETRY_BACKOFF_MAX_MS = 1000;

function RunningRequestContextArguments(contextArgs) {
  if (typeof contextArgs.sendRequest !== 'function') {
    throw new ReferenceError('sendRequest is not a function');
  }
  this.sendRequest = contextArgs.sendRequest;

  if (typeof contextArgs.isRetryable === 'function') {
    this.isRetryable = contextArgs.isRetryable;
  } else {
    this.isRetryable = function(error) {
      return error && error.retryable === true;
    }
  }

  contextArgs.backoffRange = contextArgs.backoffRange || {};
  this.backOffStart = parseInt(contextArgs.backoffRange.start, 10) || DEFAULT_RETRY_BACKOFF_MIN_MS;
  this.backOffDelta = (parseInt(contextArgs.backoffRange.end, 10) || DEFAULT_RETRY_BACKOFF_MAX_MS) - this.backOffStart;

  this.maxRetryCount = parseInt(contextArgs.maxRetryCount, 10) || DEFAULT_RETRY_MAX_COUNT;
  this.requestTryNumber = 0;
}

/**
 * Wrapper to repeat request if required
 *
 * @param {Object}   contextArgs
 * @param {Object}   args         - Passed to function making request
 * @param {Function} done         - Used in callback while making request
 */
function repeatableRequestWrapper(context, args, done) {
  context.sendRequest(args, function(error, data) {
    if (context.isRetryable(error, data) === true && context.requestTryNumber < context.maxRetryCount) {
      context.requestTryNumber += 1;
      return setTimeout(
        repeatableRequestWrapper.bind(undefined, context, args, done),
        context.backOffStart + Math.floor(Math.random() * context.backOffDelta)
      );
    }
    return done(error, data);
  });
}

/**
 * 
 * @param {Object}   contextArgs
 * @prop  {Function} sendRequest     - Function to send request receiving args and a callback as function arguments
 * @prop  {Function} [isRetryable]   - Method to determine whether request should be repeated or not
 * @prop  {Object}   [backoffRange]  - Minimum and Maximum time in milliseconds to wait before repeating
 * @prop  {Number}   [maxRetryCount] - Maximum number of times request can be repeated. Overshadows isRetryable
 * @param {Mixed}    args            - Arguments to passed while making request (follows callback pattern)
 * @param {Function} done            - Callback to pass while making request
 */
module.exports = function (contextArgs, args, done) {
  contextArgs = contextArgs || {};
  repeatableRequestWrapper(
    new RunningRequestContextArguments(contextArgs),
    args,
    done
  );
}
