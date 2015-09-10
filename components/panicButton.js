(function () {

var five   = require("johnny-five"),
    events = require('../events.js'),
    pins   = require('./pins');

  function PanicButton(){

    var button = new five.Button({pin: pins.panicButton});

    button.on("down", function() {
      events.emit('panic');
    });
  }

  module.exports = PanicButton;
}());