import {
addAgent, setAgentVariable, addItem, addLocation, setVariable, getNextLocation, action,
getRandNumber, getVariable, sequence, selector, execute, Precondition, getAgentVariable, neg_guard, guard,
isVariableNotSet, displayDescriptionAction, addUserAction, addUserInteractionTree, initialize,
getUserInteractionObject, executeUserAction, Tick, worldTick, attachTreeToAgent, setItemVariable, getItemVariable,
displayActionEffectText, areAdjacent, addUserActionTree
} from "./villanelle";

const readline = require('readline');
const fs = require('fs'); // For writing log files

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const logfile = "/Users/cmartens/VillanelleCamelotDemo/log.txt"
function throwErr(err) { if(err) throw err; };
fs.writeFile(logfile, "", throwErr);

function doAction(command : string) {
  console.log('start ' + command); // Send to camelot
  fs.appendFile(logfile, `Sent: ${command}\n`, throwErr); // Log internally
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

doAction('CreateItem(TheTorch, Torch)');
doAction('SetPosition(TheTorch, TheCamp.Stall)');

doAction("EnableIcon(Change, Hand, TheTorch, Change, true)");

doAction('Game');

console.error('Testing use of STDERR');

function doSequence(actions : string[]) {
  if(actions.length > 0) {
    doAction(actions[0]);
    onSuccess[actions[0]] = () => {
      doSequence(actions.slice(1));
    }
  }
}

// Process input

function processMessage(msg : string) {
  switch(msg) { 
    case 'Selected Start':
      doAction('SetCameraFocus(Sonia)');
      doAction('EnableInput()');
      // doAction('WalkTo(Bob, TheCamp.Stall)'); //Start aut. character behaviors
      // alternate(2000, thunkAction('WalkTo(Bob, TheCamp.Stall)'), thunkAction('WalkTo(Bob, TheCamp.Firepit)'));
      // alternateOnSuccess('WalkTo(Bob, TheCamp.Chest)', 'WalkTo(Bob, TheCamp.Firepit)');
      doSequence(['WalkTo(Bob, TheCamp.Horse)', 'WalkTo(Bob, TheCamp.Chest)', 'OpenFurniture(Bob, TheCamp.Chest)']);
    case 'Key Cancel':
      doAction('HideNarration()');
      break;
    default:
  }
}

rl.on('line', (line) => {
  fs.appendFile(logfile, `Received: ${line}\n`, throwErr);

  // should be "input"
  const validateInput = line.substring(0, line.indexOf(" "));

  if(validateInput == "input") {
    // Process the rest of the message
    const msg = line.substring(line.indexOf(" ")+1);
    processMessage(msg);
  }
  else if(validateInput == "succeeded" || validateInput == "failed") {
    const successfulAction = line.substring(line.indexOf(" ")+1);
    const f = onSuccess[successfulAction]; // Look up what to do when this succeeds
    if(f) f(); // Run f if there is something to do
  }

  // Otherwise ignore.
  
});

let onSuccess = {
}


// Automated character movement
// The manual way

function thunkAction(action) {
  return () => { doAction(action); };
}

function alternate(interval, f, g) {
  setTimeout(() => {
    f();
    alternate(interval, g, f);
  }, interval);
}

function alternateOnSuccess(action1 : string, action2 : string) {
  doAction(action1);
  onSuccess[action1] = () => {alternateOnSuccess(action2, action1); };
}

// alternate(() => {doAction('ChangeClothing(Bob, Merchant)');}, () => {doAction('ChangeClothing(Bob, Peasant)')});
// alternate(2000, thunkAction('ChangeClothing(Bob, Merchant)'), thunkAction('ChangeClothing(Bob, Peasant)'));
//alternate(2000, thunkAction('WalkTo(Bob, TheCamp.Stall)'), thunkAction('WalkTo(Bob, TheCamp.FirePit)'));


// The Villanelle way
let currentCostume = "Peasant"
function currentCostumeIs(costume): Precondition {
  return () => { return costume === currentCostume; };
}

/// XXXX stopped here on plane
let change = () => action(
  () => true,
  () => {
    doAction('ChangeClothing(Bob, Peasant)');
    currentCostume = "Peasant";
  }
);

// Bob's BT:
// Selector([
//    Guard(currentCostumeIs "Merchant", 
//      Sequence [Action(change to peasant), currentCostume="Peasant", Wait(2000)]),
//    Guard(currentCostumeIs "Peasant", 
//      Sequence [Action(change to merchant), currentCostume="Merchant", Wait(2000)]);
// ]);




