Polymer('animate-player', {

  ready : function () {
    //  Add a listener for animation end
    this.addEventListener('core-animation-finish', event => {
      this.animationLock = false;
    });
  },

  pathChanged : function () {
    this.$.animation.target = this.target.node;
    //  Check if the target is the current player
    if (this.target.node.id === 'player') {
      if (!this.animationLock) {
        //  Lock animation
        this.animationLock = true;
        //  Launch animation
        this.async(this.play);
      }
    } else {
      this.async(this.play);
    }
  },

  play : function () {
    this.$.animation.play();
  },

  toTranslate : function (value, pixels) {
    var position = this.players[this.target.uid].backupPosition;
    var result =
      `translate(${(value[0] - position[0]) * pixels}px,
      ${(value[1] - position[1]) * pixels}px)`;
    return result;
  }
  
});