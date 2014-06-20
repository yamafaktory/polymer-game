module.exports = function (game) {

  this.on('connection', function (socket) {

    //  When a new player is connected update game data
    ++game.players.number;
    game.players.uid[socket.id] = {
      position : [0, 0]
    };

    socket.on('client ready', function () {
      //  Send the player's uid
      //  and the position of all the players including player
      socket.emit('player first connection', {
        players : game.players.uid,
        uid : socket.id
      });
    });

    //  Then broadcast it to the other players
    socket.broadcast.emit('new player connection', {
      players : game.players.uid,
      uid : socket.id
    });
    console.log('++ ' + socket.id);

    socket.on('disconnect', function () {
      //  Update game data
      --game.players.number;
      delete game.players.uid[socket.id];
      console.log('-- ' + socket.id);
      console.log(game.players.uid);
      socket.broadcast.emit('player left', {
        players : game.players.uid,
        uid : socket.id
      });
    });

  });

};
