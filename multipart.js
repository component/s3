
/**
 * Module dependencies.
 */

var Emitter = require('emitter');
var request = require('superagent');
var Batch = require('batch');
var Part = require('./part');
var mean = require('mean');

/**
 * Expose `Multipart`.
 */

module.exports = Multipart;

/**
 * Initialize a new Multipart batch.
 *
 * @api private
 */

function Multipart(upload, options) {
  this.upload = upload;
  this.maxParts = options.maxParts;
}

/**
 * Mixin emitter.
 */

Emitter(Multipart.prototype);

/**
 * Perform the upload of all parts in parallel and invoke `fn(err)`.
 *
 * @param {Function} fn
 * @api private
 */

Multipart.prototype.end = function(fn){
  var self = this;

  this.parts = this.createParts();

  this.id(function(err, id){
    if (err) return fn(err);
    self.id = id;

    var batch = new Batch;

    self.parts.forEach(function(part){
      part.on('progress', self.onprogress.bind(self));
      batch.push(part.end.bind(part));
    });

    batch.end(self.complete.bind(self));
  });
};

/**
 * Handle aggregate progress.
 */

Multipart.prototype.onprogress = function(e){
  var m = mean(this.parts, function(part){
    return part.progress ? part.progress.percent : 0;
  });

  this.emit('progress', { percent: m });
};

/**
 * Perform the finalization request and invoke `fn(err)`.
 *
 * @param {Function} fn
 * @api private
 */

Multipart.prototype.complete = function(fn){
  var options = {
    name: this.upload.name,
    method: 'POST',
    query: 'UploadId' + this.id
  };

  this.upload.sign(options, function(err, url){
    if (err) return fn(err);

    request
    .post(url)
    .end(function(res){
      if (res.error) return fn(res.error);
      fn();
    });
  });
};

/**
 * Get upload id and invoke `fn(err, id)`.
 *
 * @param {Function} fn
 * @api private
 */

Multipart.prototype.id = function(fn){
  var options = {
    name: this.upload.name,
    method: 'POST',
    query: '?uploads'
  };

  this.upload.sign(options, function(err, url){
    if (err) return fn(err);

    request
    .post(url)
    .end(function(res){
      if (res.error) return fn(res.error);
      var id = res.xhr.responseXML.querySelector('UploadId').textContent;
      if (!id) return fn(new Error('no UploadId in response'));
      fn(null, id);
    });
  });
};

/**
 * Return multipart parts.
 *
 * @return {Array}
 * @api private
 */

Multipart.prototype.createParts = function(){
  var file = this.upload.file;
  var max = this.maxParts;
  var fivemb = 5 * 1024 * 1024;
  var bytes = file.size;
  var parts = [];
  var off = 0;
  var ids = 0;

  var size = Math.max(fivemb, Math.ceil(file.size / max) + 1024);

  while (bytes > 0) {
    file.slice = file.slice || file.webkitSlice || file.mozSlice;
    var blob = file.slice(off, off + size);
    var part = new Part(this, blob, ++ids);
    parts.push(part);
    off += size;
    bytes -= size;
  }

  return parts;
};
