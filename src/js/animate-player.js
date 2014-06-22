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
    var result = 'translate(';
    result += (value[0] * pixels);
    result += 'px, ';
    result += (value[1] * pixels);
    result += ')';
    return result;
  }
  
});