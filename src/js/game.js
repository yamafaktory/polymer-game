//  Import World
import {World} from './world';

var {pathFinding, io, socket} = {
  //  Include npm pathfinding library
  pathFinding : require('pathfinding'),
  //  and npm socket.io-client library
  io : require('socket.io-client')
};

//  Instanciate socket.io
var socket = io('http://127.0.0.1:1337');

//  Require polymer element scripts
require('./socket-io');
require('./animate-player');
require('./game-player');
require('./game-sprite');
require('./game-stage');

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
