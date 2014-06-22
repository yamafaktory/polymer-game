Polymer('game-player', {

  //  New player inserted into DOM
  attached : function () {
    this.pulse();
    console.info('New player attached');
  },

  //  Player removed from DOM
  detached : function () {
    console.info('New player detached');
  },

  //  Player is always walking
  ready : function () {
    var animation = this.$.walk.$.animation;
    animation.target = this.$.player;
    animation.play();
  },

  //  Animate player on click
  pulse : function () {
    var animation = this.$.pulse.$.animation;
    animation.target = this.$.player;
    animation.play();
  }
  
});