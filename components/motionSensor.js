(function () {

  var five       = require('johnny-five'),
      pins       = require('./pins'),
      events     = require('../events.js'),
      compulsive = require('compulsive');

  function MotionSensor(){

    var sensor = new five.Motion({pin: pins.motionSensor});

    sensor.on("calibrated", function() {
      events.emit('sensorReady');
    });

    // give the arm time to get home if it isn't parked.
    compulsive.wait(1500, function(){
      sensor.on("change", function(data) {
        if(data.detectedMotion === true){
          events.emit('motionStart');
        }
        else{
          events.emit('motionEnd');
        }
      });
    });
  }

  module.exports = MotionSensor;
}());