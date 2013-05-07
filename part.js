
/**
 * Module dependencies.
 */

var Emitter = require('emitter');
var request = require('superagent');

/**
 * Expose `Part`.
 */

module.exports = Part;

/**
 * Initialize a new Part.
 *
 * @api private
 */

function Part(multipart, blob, id) {
  this.type = 'application/octet-stream';
  this.upload = multipart.upload;
  this.multipart = multipart;
  this.blob = blob;
  this.id = id;
}

/**
 * Mixin emitter.
 */

Emitter(Part.prototype);

/**
 * Sign the part.
 *
 * @param {Function} fn
 * @api private
 */

Part.prototype.sign = function(fn){
  var options = {
    name: this.upload.name,
    query: '?partNumber=' + this.id + '&uploadId=' + this.multipart.id,
    mime: this.type
  };

  this.upload.sign(options, fn);
};

/**
 * Upload the part and invoke `fn(err)`.
 *
 * @param {Function} fn
 * @api private
 */

Part.prototype.end = function(fn){
  var self = this;
  var blob = this.blob;

  this.sign(function(err, url){
    var req = request.put(url);

    req.set('Content-Type', self.type);

    req.on('progress', function(e){
      self.progress = e;
      self.emit('progress', e);
    });

    req.send(blob);

    req.end(function(res){
      if (res.error) return fn(res.error);
      fn();
    });
  });
};
