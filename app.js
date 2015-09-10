(function () {

  var five = require('johnny-five'),
      compulsive = require('compulsive'),
      events = require('./events.js'),
      Arm = require('./components/arm'),
      GarbageCan = require('./components/garbageCan'),
      PanicButton = require('./components/panicButton'),
      LidButton = require('./components/lidButton'),
      RgbLed = require('./components/rgbLed'),
      MotionSensor = require('./components/motionSensor'),
      PiezoSpeaker = require('./components/piezoSpeaker'),

      millisForCatToGo = 2000, // 10000
      panicTime = 4000;

  var isPanicked = false;
  var can, panicButton, lidButton, arm, led, motionSensor, piezoSpeaker;

  var arbitrate = function(func){
    if(!isPanicked){
      func();
    }
  };

  events.register('toggleLid', function(){
    can.open();
  });

  events.register('panic', function(){

    if(!isPanicked){
      isPanicked = true;

      led.off();
      compulsive.wait(100, function(){
        led.color(led.blue);
      });

      piezoSpeaker.soundAlarm();
      compulsive.wait(panicTime, function(){
        console.log('Waited ' + panicTime + '. Emitting relax');
        events.emit('relax');
      });
    }
  });

  events.register('gotHome', function(){
    arm.scoopAgain();
  });

  events.register('allDone', function(){
    led.off();
    compulsive.wait(100, function(){
      led.pulse();
    });
  });

  events.register('relax', function(){
    console.log('Panic event over. Relaxing...');
    isPanicked = false;
    led.off();
    compulsive.wait(100, function(){
      led.pulse();
    });
  });

  events.register('openCan', function(){
    arbitrate(can.open);
  });

  events.register('closeCan', function(){
    arbitrate(can.close);
  });

  events.register('sensorReady', function(){
    arbitrate(led.pulse);
  });

  events.register('boardReady', function(){
    led = new RgbLed();
    arm = new Arm();
    can = new GarbageCan();
    panicButton = new PanicButton();
    lidButton = new LidButton();
    motionSensor = new MotionSensor();
    piezoSpeaker = new PiezoSpeaker();
  });

  events.register('motionStart', function(){

    if(arm.isAvailableToWork() && !isPanicked){
      led.on();
      compulsive.wait(50, function(){
        led.color(led.lightGreen);
      });
    }
  });

  events.register('motionEnd', function(){

    if(arm.isAvailableToWork() && !isPanicked){

      arm.setWorking();
      led.color(led.lightBlue);

      compulsive.queue([
        {
          wait:millisForCatToGo,
          task: function(){
            led.color(led.yellow);
          }
        },
        {
          wait:2000,
          task: function(){
            piezoSpeaker.soundAwake();
            led.blink();
          }
        },
        {
          wait:1800,
          task: function(){
            led.color(led.darkRed);
            arm.scoop();
          }
        }
      ]);
    }
    else{
      console.log('Arm is not parked. Ignoring motion detected event');
    }
  });

  var board = new five.Board();

  board.on('ready', function() {

    events.emit('boardReady');

    this.repl.inject({
      pp: arm,
      can: can,
      ld: function(x) {can.to(x);},
      lv: function(x) {arm.level(x);},
      s: function(x) {arm.shoulderTo(x);},
      e: function(x) {arm.elbowTo(x);},
      h: function(x) {arm.headTo(x);},
      b: function(x) {arm.baseTo(x);},
      wof: function() {led.off();},
      won: function() {led.on();},
      wbl: function(){led.blink();},
      pon: function(){led.pulse();},
      co: function(x){led.color(x);},
      spk: function(){piezoSpeaker.soundAwake();},
      spl: function(){piezoSpeaker.soundAlarm();},
      led: led
    });

    console.log('pp.scoop(), pp.dump(), pp.home(), pp.park()');
  });
}());