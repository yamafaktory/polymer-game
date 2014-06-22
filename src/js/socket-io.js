Polymer('socket-io', {

  //  Set observers
  observe : {
    'path'    : 'pathHasChanged',
    'socket'  : 'socketReady'
  },

  pathHasChanged : function () {
    this.socket.emit('player path changed', {
      path : this.path
    });
  },

  socketReady : function () {

    //  Method to add a new player on stage
    var addPlayer = data => {
      var newPlayer = new gamePlayer();
      newPlayer.setAttribute('uid', data.uid);
      newPlayer.devices = this.devices;
      this.parentNode.appendChild(newPlayer);
      console.info('Player connect:', data.uid);
    };

    //  Method to remove a player from stage
    var removePlayer = data => {
      var selector = '[uid=' + data.uid + ']';
      var player = this.parentNode.querySelector(selector);
      this.parentNode.removeChild(player);
      console.info('Player disconnect:', data.uid);
    };

    //  First, tell the server that client is now ready
    this.socket.emit('client ready');

    this.socket.on('new player connection', data => {
      //  Store players
      this.players = data.players;
      //  Add new user on stage
      addPlayer(data);
    });

    this.socket.on('player first connection', data => {
      //  Update players
      this.players = data.players;
      //  Add players on stage
      for (var property in this.player) {
        //  But not the player itself
        if (property !== data.uid) {
          addPlayer(data);
        }
      }
    });

    this.socket.on('player left', data => {
      //  Update players
      this.players = data.players;
      //  Remove player from stage
      removePlayer(data);
    });

  }

});