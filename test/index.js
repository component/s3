
/**
 * Module dependencies.
 */

var conf = require('../config');
var crypto = require('crypto');
var express = require('express');
var bytes = require('bytes');
var policy = require('s3-policy');
var fs = require('fs');

var app = express();

app.use(express.logger('dev'));
app.use(express.static(__dirname + '/../build'));

app.get('/', function(req, res){
  fs.readFile('test/index.html', 'utf8', function(err, html){
    if (err) return res.send(505);
    // generate policy

    var min = 60000;
    var hour = 60 * min;
    var now = Date.now();

    var p = policy({
      acl: 'public-read',
      expires: new Date(now + hour),
      bucket: conf.bucket,
      secret: conf.secret,
      key: conf.key,
      name: 'uploads/',
      length: bytes('2mb')
    })

    // use a template or whatever you want, just make sure
    // the "S3" global variable config is set.
    var s3 = {
      policy: p.policy,
      signature: p.signature,
      bucket: conf.bucket,
      acl: 'public-read',
      key: conf.key
    };


    html = html.replace('{{s3}}', JSON.stringify(s3));
    res.send(html);
  });
});

app.listen(4000);
console.log('listening on port 4000');

function policy(opts) {
  if (!opts) throw new Error('settings required');
  if (!opts.expires) throw new Error('.expires required');
  if (!opts.bucket) throw new Error('.bucket required');
  if (!opts.acl) throw new Error('.acl required');

  var conds = opts.conditions || [];
  conds.push({ bucket: opts.bucket });
  conds.push({ acl: opts.acl });
  
  var policy = {
    expiration: opts.expires.toISOString(),
    conditions: conds
  };

  var json = JSON.stringify(policy);
  var base = new Buffer(json).toString('base64');
  return base;
}

/**
 * SHA1 of the policy / secret.
 *
 * @param {String} policy
 * @param {String} secret
 * @return {String}
 * @api private
 */

function signature(policy, secret) {
  return crypto
    .createHmac('sha1', secret)
    .update(policy)
    .digest('base64');
}