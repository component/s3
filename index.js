
/**
 * Module dependencies.
 */

var Emitter = require('emitter')
  , qs = require('querystring');

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
 * Return querystring.
 *
 * @return {String}
 * @api private
 */

Upload.prototype.query = function(){
  return qs.stringify({
    name: this.name,
    mime: this.type
  });
};

/**
 * Fetch signed url and invoke `fn(err, url)`.
 *
 * @param {Function} fn
 * @api private
 */

Upload.prototype.sign = function(fn){
  var req = new XMLHttpRequest;
  req.open('GET', this.route + '?' + this.query(), true);

  // TODO: use xhr lib
  req.onreadystatechange = function(){
    if (4 == req.readyState) {
      fn(null, req.response);
    }
  };

  req.send();
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
  // request
  var req = this.req = new XMLHttpRequest;
  req.onload = this.onload.bind(this);
  req.onerror = this.onerror.bind(this);
  req.upload.onprogress = this.onprogress.bind(this);
  req.open('PUT', url, true);

  // TODO: use xhr lib
  req.onreadystatechange = function(){
    if (4 == req.readyState) {
      var s = req.status;
      var type = s / 100 | 0;
      if (2 == type) return fn(null, req);
      var err = new Error((req.statusText || s) + ': ' + req.response);
      err.status = s;
      fn(err);
    }
  };

  // send
  req.setRequestHeader('x-amz-acl', 'public-read');
  req.setRequestHeader('Content-Type', this.type);
  req.send(this.file.slice());
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

/**
 * Error handler.
 *
 * @api private
 */

Upload.prototype.onerror = function(e){
  this.emit('error', e);
};

/**
 * Onload handler.
 *
 * @api private
 */

Upload.prototype.onload = function(e){
  this.emit('end', this.req);
};

/**
 * Progress handler.
 *
 * @api private
 */

Upload.prototype.onprogress = function(e){
  e.percent = e.loaded / e.total * 100;
  this.emit('progress', e);
};
