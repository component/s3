
# s3

  S3 client upload library

## Installation

    $ component install component/s3

## Example

```js
var Upload = require('s3');
var drop = require('drop-anywhere');

drop(function(err, drop){
  if ('upload' != drop.type) return;
  var file = drop.item.file;
  console.log('upload %s', file.name);
  var uid = Math.random() * 1e10 | 0;
  var upload = Upload(file, { name: uid })

  var prog = document.querySelector('#progress');
  upload.on('progress', function(e){
    prog.textContent = (e.percent | 0) + '%';
  });

  upload.end(function(err){
    if (err) throw err;
    console.log('upload complete %s', upload.name);
  });
});
```

## API

### Upload(options)

  By default an upload performs a __GET__ request to the "/sign" end-point,
  which responds with a url signed by your aws secret.

  - `name` remote filename or `file.name`
  - `type` content-type or `file.type`
  - `route` signature GET route [/sign]

Events:

  - `error` an error occurred
  - `abort` upload was aborted
  - `progress` upload in progress (`e.percent` etc)
  - `end` upload is complete

## Testing

  First populate `./config.json` with your credentials:

```json
{
  "key": "asdfasdfasdfasdf",
  "secret": "asdfasdfasdfasdfasdfadsfasfdsfdasdf+fHgg",
  "bucket": "files.example.com"
}
```

  Boot the test server:

```
$ node test
```

## License

  MIT
