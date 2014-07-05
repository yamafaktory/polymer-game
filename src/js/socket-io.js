Polymer('socket-io', {

  created : function () {
    //  Property used to check for path origin
    this.ownPath = true;
  },

  //  Set observers
  observe : {
    'path'    : 'pathHasChanged',
    'socket'  : 'socketReady'
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
      var selector = `[uid='${data.uid}']`;
      var player = this.parentNode.querySelector(selector);
      this.parentNode.removeChild(player);
      console.info('Player disconnect:', data.uid);
    };

    //  Method to set the first position of a player on stage
    var setPlayerPosition = data => {
      var {selector, x, y} = {
        selector : `[uid='${data.uid}']`,
        x : (data.position[0] * this.spriteSize),
        y : (data.position[1] * this.spriteSize)
      };
      var player = this.parentNode.querySelector(selector);
      player.setAttribute('style', `top: ${y}px; left: ${x}px`);
      player.setAttribute('position', data.position);
    };

    //  Method to get a player by uid
    var getPlayerByUid = data => {
      var selector = '[uid=' + data.uid + ']';
      return this.parentNode.querySelector(selector);
    };

    //  Add pathHasChanged method now as socket.io is ready 
    this.pathHasChanged = function () {
      if (this.ownPath) {
        this.socket.emit('player path changed', {
          path  : this.path
        });
      }
    };

    //  First, tell the server that client is now ready
    this.socket.emit('client ready');

    this.socket.on('player first connection', data => {
      //  Send player position
      this.socket.emit('player first position', {
        position : this.position.from
      });
      //  Update players
      this.players = data.players;
      //  Store uid
      this.uid = data.uid;
      //  Add players on stage
      for (var property in data.players) {
        //  But not the player itself
        if (property !== data.uid) {
          addPlayer(data);
        }
      }
    });

    this.socket.on('new player connection', data => {
      //  Store players
      this.players = data.players;
      //  Add new user on stage
      addPlayer(data);
    });

    this.socket.on('player first position', data => {
      //  Set the position of a player 
      setPlayerPosition(data);
      console.info('Player id=', data.uid, ' position:', data.position);
    });

    this.socket.on('player path changed', data => {
      //  Update targeted player
      this.target = getPlayerByUid(data);
      //  Keep track of path origin
      this.ownPath = false;
      //  and the path
      this.path = data.path;
      console.log('path from server', this.path);
    });

    this.socket.on('player left', data => {
      //  Update players
      this.players = data.players;
      //  Remove player from stage
      removePlayer(data);
    });

  }

});