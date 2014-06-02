module.exports = function (game) {

  this.on('connection', function (socket) {

    ++game.players;
    console.log('++');

    socket.on('test', function (data) {
      console.log(data);
    });

    socket.on('disconnect', function () {
      --game.players;
      console.log('--');
      socket.broadcast.emit('player left', {
        id: 'id'
      });
    });

  });

};
