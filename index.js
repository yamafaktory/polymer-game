//  Game
var game = {
  players : 0
};

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

//  Init websockets module
require('./modules/websockets').call(io, game);

//  Set listening port
server.listen(1337);
