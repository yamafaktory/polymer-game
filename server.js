//  Koa
var static = require('koa-static');
var app = require('koa')();

//  Set static folders
app.use(static(__dirname + '/'));
app.use(static(__dirname + '/img'));

//  Init socket.io
var server = require('http').Server(app.callback());
var io = require('socket.io')(server);

//  Error management
app.on('error', function (err, ctx){
  log.error('server error', err, ctx);
});

//  Socket.io
io.on('connection', function (socket) {
  socket.on('test', function (data) {
    console.log(data);
  });
  //socket.emit('test', { hello: 'world' });
});

//  Set listening port
server.listen(1337);
