Polymer('animate-player', {

  ready : function () {
    //  Add a listener for animation end
    this.addEventListener('core-animation-finish', event => {
      this.animationLock = false;
    });
  },

  pathChanged : function () {
    this.$.animation.target = this.target;
    console.log('path=>', this.path);
    console.log('Target=>', this.target);
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