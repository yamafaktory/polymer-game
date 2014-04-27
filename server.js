var static  = require('koa-static');
var koa     = require('koa');
var app     = koa();

//  Static folders
app.use(static(__dirname + '/'));
app.use(static(__dirname + '/img'));

//  Error
app.on('error', function(err, ctx){
  log.error('server error', err, ctx);
});

app.listen(1337);