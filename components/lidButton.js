(function () {

  var five   = require("johnny-five"),
      events = require('../events.js'),
      pins   = require('./pins');

  function LidButton(){

    var button = new five.Button({pin: pins.lidButton});

    button.on("down", function() {
      events.emit('toggleLid');
    });
  }

  module.exports = LidButton;
}());