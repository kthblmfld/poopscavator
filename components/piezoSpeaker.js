(function () {

  var five       = require('johnny-five'),
      pins       = require('./pins'),
      events     = require('../events.js');

  //Available notes:
  // "c4 c#4 d4 d#4 e4 f4 f#4 g4 g#4 a4 a#4 b4 c5 c#5 d5 d#5 e5 f5 f#5 g5 g#5 a5 a#5 b5 c6"
  //Also available: frequency (int)
  function PiezoSpeaker(){

    var piezo = new five.Piezo(pins.speaker);

    var awaken = function(){
      piezo.play({
        song: [[800,2], [null,2], [800,2], [null,2]]
      });
    };

    var alarm = function(){
      piezo.play({
        song: 'C6 - C4 - D5 - D#4',
        tempo:1200
      });
    };

    return {
      soundAwake: awaken,
      soundAlarm: alarm
    };
  }

  module.exports = PiezoSpeaker;
}());