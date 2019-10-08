import {
addAgent, setAgentVariable, addItem, addLocation, setVariable, getNextLocation, action,
getRandNumber, getVariable, sequence, selector, execute, Precondition, getAgentVariable, neg_guard, guard,
isVariableNotSet, displayDescriptionAction, addUserAction, addUserInteractionTree, initialize,
getUserInteractionObject, executeUserAction, Tick, worldTick, attachTreeToAgent, setItemVariable, getItemVariable,
displayActionEffectText, areAdjacent, addUserActionTree
} from "./villanelle";
import { finished } from "stream";

const readline = require('readline');
const fs = require('fs'); // For writing log files

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const logfile = "/Users/cmartens/VillanelleCamelotDemo/log.txt"
function throwErr(err) { if(err) throw err; };
fs.writeFile(logfile, "", throwErr);

function addToLog(str : string) {
  fs.appendFile(logfile, str, throwErr);
}

function doAction(command : string) {
  console.log('start ' + command); // Send to Camelot
  addToLog(`Sent: start ${command}\n`); // Log internally
}

// Enter commands
doAction('CreatePlace(TheCamp, Camp)');

// Locations: Barrel, ExitSign, Exit, Horse

doAction('CreateCharacter(Sonia, F, 40)');
doAction('ChangeClothing(Sonia, LightArmour)');
doAction('SetPosition(Sonia, TheCamp.Stall)');
doAction('SetHairStyle(Sonia, Spiky)');

doAction('CreateCharacter(Bob, M, 25)');
doAction('ChangeClothing(Bob, Peasant)');
doAction('SetPosition(Bob, TheCamp.Firepit)');
doAction('SetHairStyle(Bob, Spiky)');

doAction('CreateCharacter(Robin, F, 25)');
doAction('ChangeClothing(Robin, Merchant)');
doAction('SetPosition(Robin, TheCamp.Exit)');
doAction('SetHairStyle(Robin, Straight)');

doAction('CreateItem(TheKey, Key)');
doAction('SetPosition(TheKey, TheCamp.Stall)');

// doAction('EnableIcon(Take, Take, TheTorch, "Take", true)');

doAction('CreateItem(TheApple, Apple)');

doAction('Game');

let onFinish = {} // Mutable dictionary of callbacks


function doSequence(actions : string[]) {
  if(actions.length > 0) {
    doAction(actions[0]);
    if(actions.length > 1) {
      onFinish[actions[0]] = () => {
        doSequence(actions.slice(1));
      }
    } // End if something to do after this
  } // End if action sequence nonempty
}

// Robin's Script
const robinScript =
[
  'WalkTo(Robin, TheCamp.Stall)',
  'Take(Robin, TheKey)',
  'WalkTo(Robin, Bob)',
  'Give(Robin, TheKey, Bob)'
]

onFinish['Give(Robin, TheKey, Bob)'] = () => {
  doSequence(bobScript);
}

// Bob's Script
const bobScript =
  [ 'WalkTo(Bob, TheCamp.Horse)', 
    'WalkTo(Bob, TheCamp.Chest)', 
    'OpenFurniture(Bob, TheCamp.Chest)',
    'Take(Bob, TheApple, TheCamp.Chest)',
    'WalkTo(Bob, Sonia)',
    'Give(Bob, TheApple, Sonia)'
    // , 'Pocket(Sonia, TheApple)'
  ]

// Sonia's responses
onFinish['Give(Bob, TheApple, Sonia)'] = () => {
  addToLog('Bob finished giving me the apple');
  doAction('Pocket(Sonia, TheApple)');
};

// Process input

function processMessage(msg : string) {
  switch(msg) { 
    case 'Selected Start':
      addToLog("Player selected start");
      doAction('SetCameraFocus(Sonia)');
      doAction('EnableInput()');
      // doAction('WalkTo(Bob, TheCamp.Stall)');
      // alternate(2000, thunkAction('WalkTo(Bob, TheCamp.Stall)'), thunkAction('WalkTo(Bob, TheCamp.Firepit)'));
      // alternateOnSuccess('WalkTo(Bob, TheCamp.Chest)', 'WalkTo(Bob, TheCamp.Firepit)');
      //doSequence(bobScript);
      // doSequence(robinScript);
      break;
    case 'arrived Sonia position Robin':
      doSequence(robinScript);
    case 'Key Cancel':
      doAction('HideNarration()');
      break;
    default:
  }
}


rl.on('line', (line) => {
  addToLog(`Received: ${line}\n`);

  // should be "input"
  const validateInput = line.substring(0, line.indexOf(" "));

  if(validateInput == "input") {
    // Process the rest of the message
    const msg = line.substring(line.indexOf(" ")+1);
    processMessage(msg);
  }
  
  else if(validateInput == "succeeded" || validateInput == "failed") {
    const finishedAction = line.substring(line.indexOf(" ")+1);
    addToLog(finishedAction+" finished.\n");
    // Look up what to do when this succeeds
    if(onFinish[finishedAction]) {
      addToLog("Something to do in response to "+finishedAction+" finishing");
      onFinish[finishedAction](); // Run the function if there is something to do
    } else {
      addToLog("Nothing to do in response to "+finishedAction+" finishing");
    }
  }
  // Otherwise ignore.
});

/* 
// Timer-based automation

function thunkAction(action) {
  return () => { doAction(action); };
}

function alternate(interval, f, g) {
  setTimeout(() => {
    f();
    alternate(interval, g, f);
  }, interval);
}

function alternateOnFinish(action1 : string, action2 : string) {
  doAction(action1);
  onFinish[action1] = () => {alternateOnFinish(action2, action1); };
}

// alternate(() => {doAction('ChangeClothing(Bob, Merchant)');}, () => {doAction('ChangeClothing(Bob, Peasant)')});
// alternate(2000, thunkAction('ChangeClothing(Bob, Merchant)'), thunkAction('ChangeClothing(Bob, Peasant)'));
//alternate(2000, thunkAction('WalkTo(Bob, TheCamp.Stall)'), thunkAction('WalkTo(Bob, TheCamp.FirePit)'));

*/

// The Villanelle way
let hasKey : string | null = null;

function thunkAction(action) {
  return () => { doAction(action); };
}

onFinish['Take(Robin, TheKey)'] = () => {
  hasKey = "Robin";
};

const BobBT = sequence([
  action(() => {return true;}, thunkAction('WalkTo(Bob, TheCamp.Horse')),
  selector([
    guard(() => { return hasKey == "Bob"; },
      sequence([
        action(() => {return true;}, thunkAction("WalkTo(Bob, TheCamp.Chest)")),
        action(() => {return true;}, thunkAction("OpenFurniture(Bob, TheCamp.Chest)")),
        action(() => {return true;}, thunkAction("Take(Bob, TheApple, TheCamp.Chest)")),
        action(() => {return true;}, thunkAction("WalkTo(Bob, Sonia)")),
        action(() => {return true;}, thunkAction("Give(Bob, TheApple, Sonia)"))
      ])
    ),
    action(() => {return true;}, thunkAction("WalkTo(Bob, TheCamp.Firepit"))
  ])
]);

// Bob's BT:
// Sequence([
//    walktoHorse,
//    Selector([
//      Guard(hasKey,
//        Sequence [walk to chest, open chest, take apple, walk to Sonia, give sonia the apple]),
//      Walk to Firepit;
//    ]);
// ]);




