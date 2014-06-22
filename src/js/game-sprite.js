Polymer('game-sprite', {

  created : function () {
    this.coordinates = [];
  },

  locate : function () {
    var animation;
    var x = JSON.parse(this.matrix)[0];
    var y = JSON.parse(this.matrix)[1];
    //  Check if player is not in motion
    if (this.animationLock === false) {
      //  If crossable
      if (this.binaryMap[y][x] === 0) {
        animation = this.$.pivot.$.animation;
        //  Set sprite position from matrix
        //  and parse the original string as JSON
        this.position.to = JSON.parse(this.matrix);
      } else {
        animation = this.$.heighten.$.animation;
      }
      //  Animate sprite
      animation.target = this.$.sprite;
      animation.play();
    }
  }

});