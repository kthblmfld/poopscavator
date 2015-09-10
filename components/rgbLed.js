(function () {

  var five       = require('johnny-five'),
      pins       = require('./pins'),
      compulsive = require('compulsive'),
      shield     = require('./shield');

  function RgbLed(){

    var yellow = '#8888EE',
        pink = '#00BCEE',
        lightGreen = '#DD99DD',
        blue = '#FFFF00',
        lightBlue = '#FF0000',
        darkRed = '#EEFFFF',
        lightRed = '#00FFFF';

    var rgb = new five.Led.RGB({
      pins: pins.light.rgb,
      controller: shield.driver,
      address: shield.address
    });

    var pulsing = true;

    var reset = function(){
      if(pulsing){
        pulsing = false;
      }
      rgb.stop().off();
    };

    var color = function(color){
      this.reset();
      rgb.color(color);
    };

    var pulse = function(){

      var index = 0;
      var increasing = true;

      pulsing = true;

      compulsive.loop(30, function(control) {

        if(!pulsing){
          console.log('stopping the pulse');
          control.stop();
        }

        rgb.color(index, index, index);

        if(index >= 256 || index <=-1){
          increasing = !increasing;
        }

        increasing ? index+=10 : index-=10; // jshint ignore:line
      });
    };

    var blink = function(){
      this.reset();
      rgb.blink();
    };

    var on = function(){
      this.reset();
    };

    var off = function(){
      this.reset();
      rgb.color(255,255,255);
    };

    return {
      reset: reset,
      color: color,
      pulse: pulse,
      blink: blink,
      on: on,
      off: off,
      yellow: yellow,
      pink: pink,
      lightGreen: lightGreen,
      blue:blue,
      lightBlue: lightBlue,
      darkRed: darkRed,
      lightRed: lightRed
    };
  }

  module.exports = RgbLed;
}());