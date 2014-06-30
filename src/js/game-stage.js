Polymer('game-stage', {

  created : function () {
    //  Create a lock to define either or not the player is in motion
    this.animationLock = false;
    //  Init default backup position
    this.backupPosition = [0, 0];
    //  Init default initial backup position
    this.initialBackupPosition = [0, 0];
    //  Init binary map for pathfinding
    this.binaryMap = [];
    //  Init devices for media queries
    this.devices = {};
    //  Init move object for player motion
    this.path = [0, 0];
    //  Init player position
    this.position = {
      from : [0, 0],
      to   : [0, 0]
    };
    //  Init other players
    this.players = {};
    //  Init world map
    this.world = [];
    //  Get position from localstorage
    this.addEventListener('core-localstorage-load', event => {
      if (this.backupPosition !== null) {
        //  Generate left position
        this.backupPositionX = (
          this.backupPosition[0] * this.spriteSize
        ) + 'px';
        //  Generate top position
        this.backupPositionY = (
          this.backupPosition[1] * this.spriteSize
        ) + 'px';
        //  Set backup position as current
        this.position.from = this.backupPosition;
        //  Store the initial position found from localstorage 
        this.initialBackupPosition = this.backupPosition;
      }
    });
  },

  //  Set observers
  observe : {
    //  Devices
    'devices.mobile'  : 'deviceHasChanged',
    'devices.medium'  : 'deviceHasChanged',
    'devices.large'   : 'deviceHasChanged',
    'devices.xlarge'  : 'deviceHasChanged',
    'devices.xxlarge' : 'deviceHasChanged',
    //  Player position
    'position.to'     : 'playerPositionHasChanged',
    //  World
    'world'           : 'worldHasChanged'
  },

  ready : function () {
    //  Set up player animation
    this.animation = this.$.move.$.animation;
    this.target = this.$.player;
  },

  //  Device has changed
  deviceHasChanged : function () {
    if (this.devices.mobile)  { this.spriteSize = 60; }
    if (this.devices.medium)  { this.spriteSize = 75; }
    if (this.devices.large)   { this.spriteSize = 90; }
    if (this.devices.xlarge)  { this.spriteSize = 105; }
    if (this.devices.xxlarge) { this.spriteSize = 120; }
  },

  //  Player position has changed
  playerPositionHasChanged : function () {
    //  Backup the grid as its value is modified after path-finding
    var gridBackup = this.grid.clone();
    //  Then use the finder to generate an array of moves
    this.path = this.finder.findPath(
      this.position.from[0],
      this.position.from[1],
      this.position.to[0],
      this.position.to[1],
      this.grid
    );
    //  Restore original grid
    this.grid = gridBackup;
    //  Set updated position accordingly
    this.position.from = this.position.to;
    //  Create a backup in localstorage
    this.backupPosition = this.position.to;
  },

  worldHasChanged : function () {
    //  Reuse pathfinding library object's name
    var PF = this.pathFinding;
    //  Create a grid & define heuristic
    this.grid = new PF.Grid(20, 20, this.binaryMap);
    this.finder = new PF.AStarFinder({heuristic: PF.Heuristic.chebyshev});
  }

});