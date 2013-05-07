
/**
 * Module dependencies.
 */

var request = require('superagent');
var Multipart = require('./multipart');
var Emitter = require('emitter');

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
 *   - `type` content-type or `file.type` / application/octet-stream
 *   - `route` signature GET route [/sign]
 *   - `maxParts` max parallel parts [6]
 *   - `multipartThreshold` [20mb]
 *
 * Events:
 *
 *   - `error` an error occurred
 *   - `abort` upload was aborted
 *   - `progress` upload in progress (`e.percent` etc)
 *   - `end` upload is complete
 *
<<<<<<< HEAD
 * TODO: progress
 * TODO: add option for max parts
 * TODO: add option for opting-out
=======
 * Multipart:
 *
 *  Each s3 "part" must be at least 5mb, except the last part.
>>>>>>> add/multipart-support
 *
 * @param {File} file
 * @param {Object} [options]
 * @api private
 */

function Upload(file, options) {
  if (!(this instanceof Upload)) return new Upload(file, options);
  options = options || {};
  this.file = file;
  this.type = options.type || file.type || 'application/octet-stream';
  this.name = options.name || file.name;
  this.route = options.route || '/sign';
  this.header = {};
  this.maxParts = options.maxParts || 6;
  var mb = 1024 * 1024;
  this.multipartThreshold = options.multipartThreshold || 20 * mb;
}

/**
 * Mixin emitter.
 */

Emitter(Upload.prototype);

/**
 * Set header `field` to `val`.
 *
 * @param {String} field
 * @param {String} val
 * @return {Upload} self
 * @api public
 */

Upload.prototype.set = function(field, val){
  this.header[field] = val;
  return this;
};

/**
 * Fetch signed url and invoke `fn(err, url)`.
 *
 * @param {Function} fn
 * @api private
 */

Upload.prototype.sign = function(obj, fn){
  request
  .get(this.route)
  .query(obj)
  .end(function(res){
    fn(null, res.text);
  });
};

/**
 * Check `File#size` is above the multipart threshold specified.
 *
 * @return {Boolean}
 * @api private
 */

Upload.prototype.shouldUseMultipart = function(){
  return 'number' == typeof this.file.size
    && this.file.size > this.multipartThreshold;
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

  if (this.shouldUseMultipart()) {
    return this.multipart(fn);
  }

  var options = {
    name: this.name,
    mime: this.type,
    acl: 'public-read'
  };

  this.sign(options, function(err, url){
    if (err) return fn(err);
    self.put(url, fn);
  });
};

/**
 * Upload using multipart and invoke `fn(err)`.
 *
 * @param {Function} fn
 * @api private
 */

Upload.prototype.multipart = function(fn){
  var multipart = new Multipart(this, { maxParts: this.maxParts });
  multipart.on('progress', this.emit.bind(this, 'progress'));
  multipart.end(fn);
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
  var req = this.req = request.put(url);

  // header
  req.set('X-Requested-With', null);
  req.set('Content-Type', this.type);
  req.set('x-amz-acl', 'public-read');

  // custom fields
  for (var key in this.header) {
    req.set(key, this.header[key]);
  }

  // progress
  req.on('progress', function(e){
    self.emit('progress', e);
  });

  // send
  var file = this.file.toFile
    ? this.file.toFile()
    : this.file;

  req.send(file);

  req.end(function(res){
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
