module.exports = function (game) {

  this.on('connection', function (socket) {

    //  When a new player is connected update game data
    ++game.players;
    //  Then send the uid to the other players
    socket.broadcast.emit('new player connection', {
      uid: socket.id
    });
    console.log('++ ' + socket.id);

    socket.on('test', function (data) {
      console.log(data);
    });

    socket.on('disconnect', function () {
      --game.players;
      console.log('-- ' + socket.id);
      socket.broadcast.emit('player left', {
        id: 'id'
      });
    });

  });

};
