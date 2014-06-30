Polymer('animate-player', {

  ready : function () {
    //  Add a listener for animation end
    this.addEventListener('core-animation-finish', event => {
      this.animationLock = false;
    });
  },

  pathChanged : function () {
    this.$.animation.target = this.target;
    if (this.animationLock === false) {
      this.async(this.play);
    }
  },

  play : function () {
    //  Lock animation
    this.animationLock = true;
    //  Launch animation
    this.$.animation.play();
  },

  toTranslate : function (value, pixels) {
    var position = this.initialBackupPosition;
    var result =
      `translate(${(value[0] - position[0]) * pixels}px,
      ${(value[1] - position[1]) * pixels}px)`;
    return result;
  }
  
});