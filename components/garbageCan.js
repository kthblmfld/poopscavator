(function () {

  var five       = require('johnny-five'),
      compulsive = require('compulsive'),
      pins       = require('./pins'),
      events = require('../events.js'),
      shield     = require('./shield');

  function GarbageCan(){

    var states = {
      open: 160,
      closed: 10
    };

    var lidServo = new five.Servo(
      {
        pin: pins.lid,
        startAt: states.closed,
        controller: shield.driver,
        address: shield.address
      });

    var open = function() {
      lidServo.to(states.open);
    };

    var close = function() {
      lidServo.to(states.closed);
    };

    var to = function(x) {
      lidServo.to(x);
    };

    events.register("panic", function(){
      close();
    });

    return {
      open: open,
      close: close,
      to: to
    }
  }

  // Augment with compulsive APIs
  [ "wait", "loop", "queue" ].forEach(function( api ) {
    GarbageCan.prototype[ api ] = compulsive[ api ];
  });

  module.exports = GarbageCan;

}());