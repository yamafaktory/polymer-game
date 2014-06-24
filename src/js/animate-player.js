Polymer('animate-player', {

  ready : function () {
    //  Add a listener for animation end
    this.addEventListener('core-animation-finish', event => {
      this.animationLock = false;
    });
  },

  pathChanged : function () {
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
    var result = `translate(${value[0] * pixels}px, ${value[1] * pixels}px)`;
    return result;
  }
  
});