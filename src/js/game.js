//  Import classes
import {World} from './world';

//  Create new World
var polyworld = new World();

//  Generate the binary map
polyworld.toBinaryMatrix();

//  Add polymer event listener
window.addEventListener('polymer-ready',
  event => {
    //  Select game stage
    var gameStage = document.querySelector('game-stage');
    //  Init world property 
    gameStage.world = polyworld.map;
    //  Init binary map property 
    gameStage.binaryMap = polyworld.binaryMap;
  }
);