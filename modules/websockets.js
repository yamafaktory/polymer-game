module.exports = function (game) {

  this.on('connection', function (socket) {

    //  When a new player is connected update game data
    ++game.players.number;
    game.players.uid[socket.id] = {
      position : [0, 0]
    };

    //  Then broadcast it to the other players
    socket.broadcast.emit('new player connection', {
      players : game.players.uid,
      uid : socket.id
    });

    //  When client is ready
    socket.on('client ready', function () {
      //  Send the player's uid
      //  and the position of all the players including player
      socket.emit('player first connection', {
        players : game.players.uid,
        uid : socket.id
      });
    });

    //  When client send updated path
    socket.on('player path changed', function (data) {
      console.log(data.path);
    });

    //  Handle disconnection
    socket.on('disconnect', function () {
      //  Update game data
      --game.players.number;
      delete game.players.uid[socket.id];
      socket.broadcast.emit('player left', {
        players : game.players.uid,
        uid : socket.id
      });
    });

  });

};
