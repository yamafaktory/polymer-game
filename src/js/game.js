//  Import World class
import {World} from './world';

//  Import whole modules without specific identifiers
module pathFinding from 'pathfinding';
module io from 'socket.io-client';

//  Instanciate socket.io
var socket = io('http://127.0.0.1:1337');

//  Import polymer element scripts
import './socket-io';
import './animate-player';
import './game-player';
import './game-sprite';
import './game-stage';

//  Create new World
var polyworld = new World();

//  Generate the binary map
polyworld.toBinaryMatrix();

//  Add polymer event listener
window.addEventListener('polymer-ready', event => {
  //  Select game stage
  var gameStage = document.querySelector('game-stage');
  //  Init pathFinding property
  gameStage.pathFinding = pathFinding;
  //  Init socket property
  gameStage.socket = socket;
  //  Init world property
  gameStage.world = polyworld.map;
  //  Init binary map property
  gameStage.binaryMap = polyworld.binaryMap;
});
