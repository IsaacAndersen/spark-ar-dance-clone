// LOAD MODULES ====================================================================
const Diagnostics = require('Diagnostics');
const Scene = require('Scene');
const Reactive = require('Reactive');
const Animation = require('Animation');
const Patches = require('Patches');
const Time = require('Time');

// HELPER FUNCTIONS ================================================================
function d2r(degrees) { return degrees * (Math.PI/180); }

// CONSTANTS =======================================================================
const numArrows = 9;
const perfectHitPoints = 100;
const normalHitPoints = 25;
const subVal = 1.5; // y-distance beneath the outline when an arrow is considered "out of play" -- shrink after this

var arrows = new Array(numArrows);

// FALLING ANIMATION ===============================================================
const timeDriver = Animation.timeDriver({
  durationMilliseconds: numArrows*1450,
  loopCount: Infinity,
  mirror: false
});

const sampler = Animation.samplers.easeInQuad(50,-15*numArrows-25);
const translationAnimation = Animation.animate(timeDriver, sampler);

var animationVal = Reactive.pack3(0,translationAnimation,0);

// SCOREBOARD STUFF ================================================================
var scoreLabel = Scene.root.find("scoreLabel");
var scoreLabel0 = Scene.root.find("scoreLabel0");
scoreLabel0.text = scoreLabel.text;
scoreLabel.text = "0";
var score = 0;
var labelScore = 0;

var comboLabel = Scene.root.find("comboLabel");
var comboLabel0 = Scene.root.find("comboLabel0");
comboLabel.text = "";
comboLabel.hidden = true;
comboLabel0.text = comboLabel.text;
comboLabel0.hidden = comboLabel.hidden;

var combo = 0;

// LIGHTNING EFFECT
var lL = Scene.root.find("lightningL");
var lR = Scene.root.find("lightningR");
var lM = Scene.root.find("lightningM");

var lightnings = [lL, lR, lM];

function hideLightning() {
	lightnings[0].hidden = true;
	lightnings[1].hidden = true;
	lightnings[2].hidden = true;
}

function addScore(points, i) {
	score += points;
	lightnings[i].hidden = false;
	Time.setTimeout(hideLightning, 350);
}

/**
	This animates the score going up so it looks like it's counting.
	Note: This is probably a really dumb way to accomplish this effect because of the high callback rate.
**/

function additionInterval() {
	if (labelScore < score) {
		if (score - labelScore <= 50) {
			labelScore = score;
		} else {
			labelScore += Math.floor((score - labelScore)/3);
		}
		scoreLabel.text = ""+labelScore;
	}
}

Time.setInterval(additionInterval, 250);


// SETUP FALLING ARROWS & ANIMATIONS ========================================================================================
var outlineArrows = [Scene.root.find("arrow_L"), Scene.root.find("arrow_R"), Scene.root.find("arrow_U")];

for (let i = 0; i < numArrows; i++) {
	arrows[i] = Scene.root.find('fa_' + i);
	switch (i % 3) {
		case 0: // Left Arrow
			arrows[i].transform.position = Reactive.pack3(-8,0,0).add(animationVal).add(Reactive.pack3(0,20*i,0));
			arrows[i].transform.rotationZ = d2r(180);
			break;
		case 1: // Right Arrow
			arrows[i].transform.position = Reactive.pack3(8,0,0).add(animationVal).add(Reactive.pack3(0,20*i,0));
			arrows[i].transform.rotationZ = d2r(0);
			break;
		case 2: // Up Arrow
			arrows[i].transform.position = Reactive.pack3(0,0,0).add(animationVal).add(Reactive.pack3(0,20*i,0));
			arrows[i].transform.rotationZ = d2r(90);
			break;
	}
	const tD = Animation.timeDriver({
	  durationMilliseconds: 2000,
	  loopCount: 2,
	  mirror: true
	});


	const rF = Scene.root.find("redFire");
	const oF = Scene.root.find("orangeFire");
	const yF = Scene.root.find("yellowFire");

	const samp = Animation.samplers.linear(1.25,.25);
	const tA = Animation.animate(tD, samp);

	arrows[i].transform.scaleX = tA;
	arrows[i].transform.scaleY = tA;

	arrows[i].belowTarget = arrows[i].transform.y.lt(outlineArrows[i % 3].transform.y.sub(subVal));


	arrows[i].belowTarget.monitor().subscribe(function(e) {
		const thisArrowIndex = i;
		if (e["newValue"] === true) { // This particular arrow is "out of play"

			rF.birthrate = Reactive.val(150).mul(combo).div(4);
			oF.birthrate = Reactive.val(200).mul(combo).div(4);
			yF.birthrate = Reactive.val(250).mul(combo).div(4);


			if (arrows[i].isHit) { // The .isHit value is set below in the section where we check head movement
				arrows[i].hidden = true;
				combo += 1;

				if(combo >= 2) {
					comboLabel.hidden = false;
					comboLabel.text = "Combo x "+combo;
				}
				// TODO: Animate the Disappear Effect
			} else {
				combo = 0;
				comboLabel.hidden = true;
				tD.start();
			}
		} else { // The arrow's back at the top, Reset any effects we've made
			arrows[i].isHit = false;
			arrows[i].hidden = false;
			tD.reset();
		}
	});
}

// MONITOR HEAD MOVEMENT / CHECK FOR HITS ================================================================================
var pulses = ['turnedLeft','turnedRight','turnedUp'];

for (let i = 0; i < pulses.length; i++) {
	Patches.getPulseValue(pulses[i]).subscribeWithSnapshot({ // Every third arrow is in the same orientation (L,R,U)
		"target": outlineArrows[i].transform.position.y,
		"a_0": arrows[i].transform.position.y,
		"a_1": arrows[i+3].transform.position.y,
		"a_2": arrows[i+6].transform.position.y
	}, function (e, ss) {
		for (let j = 0; j < 3; j++) {
			var arrowNum = j*3+i;
			if (Math.abs(ss["target"] - ss["a_"+j]) < 2 && ss["target"] - ss["a_"+j] < subVal) { // "PERFECTLY TIMED" HIT
				//Diagnostics.log("PERFECT HIT!! Arrow: "+arrowNum);
				arrows[arrowNum].isHit = true;
				addScore(perfectHitPoints*Math.max(1,combo), i);
			} else if (Math.abs(ss["target"] - ss["a_"+j]) < 5  && ss["target"] - ss["a_"+j] < subVal) { // NORMAL HIT
				//Diagnostics.log("HIT!! Arrow: "+arrowNum);
				arrows[arrowNum].isHit = true;
				addScore(normalHitPoints*Math.max(1,combo), i);
			}
		}
	});
}

timeDriver.start();