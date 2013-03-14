
/**
 * Module dependencies.
 */

var Emitter = require('emitter')
  , request = require('superagent');

/**
 * Expose `Upload`.
 */

module.exports = Upload;

/**
 * Initialize a new `Upload` file` and options.
 *
 * Options:
 *
 *   - `name` remote filename or `file.name`
 *   - `type` content-type or `file.type`
 *   - `route` signature GET route [/sign]
 *
 * Events:
 *
 *   - `error` an error occurred
 *   - `abort` upload was aborted
 *   - `progress` upload in progress (`e.percent` etc)
 *   - `end` upload is complete
 *
 * @param {File} file
 * @param {Object} [options]
 * @api private
 */

function Upload(file, options) {
  if (!(this instanceof Upload)) return new Upload(file, options);
  options = options || {};
  this.file = file;
  this.type = options.type || file.type;
  this.name = options.name || file.name;
  this.route = options.route || '/sign';
}

/**
 * Mixin emitter.
 */

Emitter(Upload.prototype);

/**
 * Fetch signed url and invoke `fn(err, url)`.
 *
 * @param {Function} fn
 * @api private
 */

Upload.prototype.sign = function(fn){
  request
  .get(this.route)
  .query({ name: this.name, mime: this.type })
  .end(function(res){
    fn(null, res.text);
  });
};

/**
 * Upload the file and invoke `fn(err)`.
 *
 * @param {Function} [fn]
 * @api public
 */

Upload.prototype.end = function(fn){
  var self = this;
  fn = fn || function(){};
  this.sign(function(err, url){
    if (err) return fn(err);
    self.put(url, fn);
  });
};

/**
 * PUT to `url` and invoke `fn(err)`.
 *
 * @param {String} url
 * @param {Function} fn
 * @api private
 */

Upload.prototype.put = function(url, fn){
  var self = this;
  var blob = this.file.slice();
  var req = this.req = request.put(url);

  // header
  req.set('X-Requested-With', null);
  req.set('Content-Type', this.type);
  req.set('x-amz-acl', 'public-read');

  // progress
  req.on('progress', function(e){
    self.emit('progress', e);
  });

  // send
  req.send(blob);

  req.end(function(err, res){
    if (err) return fn(err);
    if (res.error) return fn(res.error);
    self.emit('end');
    fn();
  });
};

/**
 * Abort the XHR.
 *
 * @api public
 */

Upload.prototype.abort = function(){
  this.emit('abort');
  this.req.abort();
};

