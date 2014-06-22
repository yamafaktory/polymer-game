//  Include npm pathfinding library
var pathFinding = require('pathfinding');

//  Include npm socket.io-client library
var io = require('socket.io-client');
var socket = io('http://127.0.0.1:1337');

//  Require polymer element scripts
require('./socket-io');
require('./animate-player');
require('./game-player');
require('./game-sprite');
require('./game-stage');

//  Import World
import {World} from './world';

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
