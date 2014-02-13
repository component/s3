/**
 * Module dependencies.
 */

var conf = require('../config');
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
