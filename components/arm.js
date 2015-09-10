(function () {

  var compulsive = require('compulsive'),
      five       = require('johnny-five'),
      events     = require('../events.js'),
      pins       = require('./pins'),
      shield     = require('./shield');

  var states = {
    gotHome: 'gotHome',  // default, ready
    parked: 'parked', // stored, sleeping
    working: 'working',
    parking: 'parking'
  };

  var state = states.parked;

  function Arm(){

    var baseServo, shoulderServo, headServo, elbowServo, armAnimation, baseAnimation;

    var msRotateToBin = 3000,
        msBetweenScoops = 500,
        msToShakePosition = 2000,
        baseRotationAmount = 10;

    var base = {
      home: 90,
      parked: 10,
      // offset between min,max should be an offset of baseRotationAmount
      scoopMaxLeft: 105,
      scoopMinRight: 55
    };
    var elbow = {
      home: 98,
      parked: 90,
      open: 45
    };
    var shoulder = {
      home: 140,
      parked: 140
    };
    var head = {
      home: 15,
      parked: 0,
      lowered: 145
    };

    var baseDirection = base.scoopMinRight;
    var scoopDepth = 1, levellingPass = 1;
    var SCOOP_DEPTH_MAX = 2, LEVELLNG_MAX_PASSES = 2;

    var parkSequence = {
      duration: 2000,
      oncomplete: function() {
        state = states.parked;
        console.log('park complete');
      },
      cuePoints: [0, 0.5, 1.0],
      keyFrames: [
        // base, shoulder, elbow, head
        [null,
          false,
          {degrees: base.parked, easing: 'outSine'}  // base
        ],
        [null,
          {degrees: shoulder.parked, easing: 'outSine'},  // shoulder
          false
        ],
        [null,
          {degrees: 95, easing: 'outSine'} // elbow
        ],
        [null,
          {degrees: 110, easing: 'outSine'},  // head
          false
        ]
      ]
    };

    var homeSequence = {
      duration: 2000,
      oncomplete: function() {
        events.emit('gotHome');
      },
      keyFrames: [
        // base, shoulder, elbow, head
        [null, {degrees: base.home, easing: 'outCirc'}],   // base
        [null, {degrees: shoulder.home, easing: 'outCirc'}],   // shoulder
        [null, {degrees: elbow.home, easing: 'outCirc'}],  // elbow
        [null, {degrees: head.home, easing: 'outCirc'}]    // head
      ]
    };

    // Initialize arm components
    baseServo = new five.Servo(
      {
        pin: pins.arm.base,
        startAt: base.parked,
        direction: base.home,
        controller: shield.driver,
        address: shield.address
      });
    shoulderServo = new five.Servo(
      {
        pin: pins.arm.shoulder,
        startAt: shoulder.home,
        controller: shield.driver,
        address: shield.address
      });
    elbowServo = new five.Servo(
      {
        pin: pins.arm.elbow,
        startAt: elbow.home,
        controller: shield.driver,
        address: shield.address
      });
    headServo = new five.Servo(
      {
        pin: pins.arm.head,
        startAt: head.home,
        controller: shield.driver,
        address: shield.address
      });

    var allServos = new five.Servo.Array([baseServo, shoulderServo, elbowServo, headServo]);
    armAnimation = new five.Animation(allServos);   // All servos on the arm
    baseAnimation = new five.Animation(baseServo); // Only the base of the arm

    var shoulderTo = function(x){shoulderServo.to(x);};
    var elbowTo = function(x){elbowServo.to(x);};
    var headTo = function(x){headServo.to(x);};
    var baseTo = function(x){baseServo.to(x);};
    var park = function() {
      armAnimation.enqueue(parkSequence);
    };

    var isAvailableToWork = function(){
      return (state === states.parked || state === states.gotHome);
    };

    var setWorking = function(){state = states.working;};

    var isWorking = function(){return state === states.working;};

    var scoopAgain = function(){
      if(state === states.working){
        events.emit('directionComplete');
      }
      else{
        state = states.gotHome;
      }
    };

    var home = function() {
      armAnimation.enqueue(homeSequence);
    };

    var moveToShakePosition = function(){
      if(isWorking()){
        baseServo.to(base.home, 800);
        shoulderServo.to(120, 800);
      }
    };

    var shake = function(){

      compulsive.wait(msToShakePosition, function() {
        var shakes = [];
        for(var i = 0; i < 9; i++){
          shakes.push({wait: 150, task: function() {
            if(isWorking()){headServo.to(84);shoulderServo.to(120);}}
          });
          shakes.push({wait: 150, task: function() {
            if(isWorking()) {headServo.to(90);shoulderServo.to(110);}}
          });
        }
        compulsive.queue(shakes);
      });
    };

    var dump = function() {

      moveToShakePosition();
      shake();

      compulsive.wait(2000, function() {
        console.log('dumping in can');
        compulsive.queue(
          [
            {
              wait: 4000, task: function() {

                if(isWorking()){

                  events.emit('openCan');
                  elbowServo.to(25, 1000);
                  headServo.to(100, 1000);
                  baseAnimation.enqueue({
                    duration: msRotateToBin,
                    cuePoints: [0, 0.35, 0.7, 1.0],
                    keyFrames: [
                      {degrees: 60, easing: 'inQuint'},
                      {degrees: 40},
                      {degrees: 10, easing: 'outCube'}]
                  });
                }
              }
            },

            {wait: 800, task: function() {if(isWorking()){shoulderServo.to(110);}}},
            {wait: 800, task: function() {if(isWorking()){elbowServo.to(40);}}},
            {wait: 300, task: function() {if(isWorking()){headServo.to(170);}}}, //down
            {wait: 300, task: function() {if(isWorking()){headServo.to(110);}}}, //up
            {wait: 300, task: function() {if(isWorking()){headServo.to(170);}}},
            {wait: 300, task: function() {if(isWorking()){headServo.to(110);}}},
            {wait: 300, task: function() {if(isWorking()){headServo.to(170);}}},
            {wait: 300, task: function() {if(isWorking()){headServo.to(110);}}},

            // retreat to a safe place to ready for home position, dump any straggling payload
            {wait: 400, task: function() {if(isWorking()){headServo.to(110);}}},
            {wait: 400, task: function() {if(isWorking()){baseServo.to(60, 400);}}},
            {wait: 300, task: function() {if(isWorking()){events.emit('closeCan');}}},
            {wait: 800, task: function() {if(isWorking()){headServo.to(180);}}},

            {wait: 800, task: function() {if(isWorking()){armAnimation.enqueue(homeSequence);}}}
          ]);
      });
    };

    var innerScoopSequence = function(direction){
      return {
        duration: 3000,
        cuePoints: [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1.0],
        oncomplete: function() {
          console.log('scoop complete');
          events.emit('scoopComplete');
        },
        keyFrames: [
          // base, shoulder, elbow, head

          // base
          [null,
            {degrees: direction, easing: 'inOutCirc'}
          ],

          // shoulder
          [null,
            {degrees: shoulder.home, easing: 'inOutCirc'},
            {degrees: 140, easing: 'inOutCirc'},
            {degrees: 100, easing: 'inOutCirc'},
            {degrees: 80, easing: 'inOutCirc'},
            //{degrees: 50, easing: 'inOutCirc'},
            {degrees: (baseDirection < 85 || baseDirection > 95) ? 80 : 50, easing: 'inOutCirc'},
            {degrees: (baseDirection < 85 || baseDirection > 95) ? 100 : 80, easing: 'inOutCirc'}
          ],

          // elbow
          [null,
            {degrees: elbow.open, easing: 'inOutCirc'},
            {degrees: 95, easing: 'inOutCirc'},
            {degrees: 130, easing: 'inOutCirc'},
            {degrees: 100, easing: 'inOutCirc'},
            {degrees: (baseDirection < 85 || baseDirection > 95) ? 100 : 80, easing: 'inOutCirc'}
          ],
          // head
          [null,
            {degrees: head.lowered, easing: 'inOutCirc'},
            false,
            false,
            {degrees: 130, easing: 'inOutCirc'},
            {degrees: 90, easing: 'inOutCirc'}
          ]
        ]
      };
    };

    var outerScoopSequence = function(direction){
      return {
        duration: 3000,
        cuePoints: [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1.0],
        oncomplete: function() {
          console.log('scoop complete');
          events.emit('scoopComplete');
        },
        keyFrames: [
          // base, shoulder, elbow, head

          // base
          [null, {degrees: direction, easing: 'inOutCirc'}],

          // shoulder
          [null,
            {degrees: shoulder.home, easing: 'inOutCirc'},
            {degrees: 140, easing: 'inOutCirc'},
            {degrees: 50, easing: 'inOutCirc'},
            {degrees: 60, easing: 'inOutCirc'},
            {degrees: 100, easing: 'inOutCirc'}
          ],

          // elbow
          [null,
            {degrees: elbow.open, easing: 'inOutCirc'},
            {degrees: 95, easing: 'inOutCirc'},
            {degrees: 90, easing: 'inOutCirc'},
            {degrees: 80, easing: 'inOutCirc'},
            {degrees: 100, easing: 'inOutCirc'}
          ],
          // head
          [null,
            {degrees: 160, easing: 'inOutCirc'},
            {degrees: 150, easing: 'inOutCirc'},
            {degrees: 140, easing: 'inOutCirc'},
            false,
            {degrees: 90, easing: 'inOutCirc'}
          ]
        ]
      };
    };


    // TODO: Refactor common logic out of scoop and level sequences

    var levellingSequence = function(){
      return {
        duration: 3000,
        cuePoints: [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1.0],
        onstart: function(){
          console.log('levelling in direction: ', baseDirection);
        },
        oncomplete: function() {
          console.log('level complete');
          events.emit('levelComplete');
        },
        keyFrames: [
          // base, shoulder, elbow, head

          // base
          [null,
            {degrees: baseDirection, easing: 'inOutCirc'}
          ],

          // shoulder
          [null,
            {degrees: shoulder.parked, easing: 'inOutCirc'},
            {degrees: 70, easing: 'inOutCirc'},
            false,
            {degrees: 120, easing: 'inOutCirc'},
            {degrees: 130, easing: 'inOutCirc'}
          ],

          // elbow
          [null,
            {degrees: elbow.parked, easing: 'inOutCirc'},
            {degrees: (baseDirection < 85 || baseDirection > 95) ? 110 : 80, easing: 'inOutCirc'},
            {degrees: 120, easing: 'inOutCirc'},
            {degrees: 130, easing: 'inOutCirc'}
          ],
          // head
          [null,
            {degrees: (baseDirection < 85 || baseDirection > 95) ? 90 : 120, easing: 'inOutCirc'},
            {degrees: 120, easing: 'inOutCirc'},
            {degrees: 140, easing: 'inOutCirc'},
            {degrees: 160, easing: 'inOutCirc'},
            {degrees: 90, easing: 'inOutCirc'}
          ]
        ]
      };
    };

    var level = function(){

      if(baseDirection > base.scoopMaxLeft || baseDirection < base.scoopMinRight){
        baseDirection = base.scoopMinRight;
        levellingPass += 1;
      }

      if(typeof baseDirection === 'undefined'){
        console.log('Direction is undefined. Setting to default');
        baseDirection = base.scoopMinRight;
      }
      else{
        baseDirection += baseRotationAmount;
      }

      armAnimation.enqueue(levellingSequence());
    };

    events.register('levelComplete', function(){
      compulsive.queue([{
        wait:500, task: function(){
          if(isWorking()){
            if(levellingPass <= LEVELLNG_MAX_PASSES){
              level();
            }
            else{
              park();
              events.emit('allDone');
            }
          }
        }
      }]);
    });

    var scoop = function() {

      if(baseDirection > base.scoopMaxLeft || baseDirection < base.scoopMinRight){
        throw 'Can\'t scoop that wide without a collision!';
      }

      if(typeof baseDirection === 'undefined'){
        console.log('baseDirection is undefined. Setting to default');
        baseDirection = base.scoopMinRight;
      }

      if(scoopDepth === 1){
        armAnimation.enqueue(innerScoopSequence(baseDirection));
      }
      else{
        armAnimation.enqueue(outerScoopSequence(baseDirection));
      }
    };

    events.register('scoopComplete', function(){
      dump();
    });

    events.register('panic', function(){
      armAnimation.stop();
      baseAnimation.stop();
      state = states.parking;
      park();
    });

    events.register('directionComplete', function(){

      baseDirection += baseRotationAmount;
      if(baseDirection <= base.scoopMaxLeft){
        compulsive.wait(msBetweenScoops, function(){
          scoop();
        });
      }
      else if(scoopDepth < SCOOP_DEPTH_MAX){
        scoopDepth += 1;
        baseDirection = base.scoopMinRight;
        compulsive.wait(msBetweenScoops, function(){
          scoop();
        });
      }
      else{
        // Done scooping. Reset direction/depth, level the litter
        scoopDepth = 1;
        baseDirection = base.scoopMinRight;
        compulsive.wait(300, function() {
          level();
        });
      }

    });

    return {
      isAvailableToWork:isAvailableToWork,
      dump: dump,
      scoop: scoop,
      level: level,
      home: home,
      setWorking: setWorking,
      scoopAgain: scoopAgain,
      shoulderTo: shoulderTo,
      elbowTo: elbowTo,
      headTo: headTo,
      baseTo: baseTo
    }
  }

  module.exports = Arm;

}());