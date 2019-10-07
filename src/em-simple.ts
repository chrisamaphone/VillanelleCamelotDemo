import {
addAgent, setAgentVariable, addItem, addLocation, setVariable, getNextLocation, action,
getRandNumber, getVariable, sequence, selector, execute, Precondition, getAgentVariable, neg_guard, guard,
isVariableNotSet, displayDescriptionAction, addUserAction, addUserInteractionTree, initialize,
getUserInteractionObject, executeUserAction, worldTick, attachTreeToAgent, setItemVariable, getItemVariable,
displayActionEffectText, areAdjacent, addUserActionTree
} from "./villanelle";

const readline = require('readline');
const fs = require('fs'); // For writing log files

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const logfile = "log.txt"
function throwErr(err) { if(err) throw err; };
fs.writeFile(logfile, "", throwErr);

function doAction(command : string) {
  console.log('start ' + command);
}

// Enter commands
doAction('CreatePlace(BobsHouse, Cottage)');
doAction('CreateCharacter(Bob, M, 25)');
doAction('ChangeClothing(Bob, Peasant)');
doAction('SetPosition(Bob, BobsHouse.Door)');
doAction('EnableIcon("Open_Door", Open, BobsHouse.Door, "Leave the house", true)');
doAction('Game');

console.error('Testing use of STDERR');

// Process input

function processMessage(msg : string) {
  switch(msg) { 
    case 'Selected Start':
      doAction('SetCameraFocus(Bob)');
      doAction('EnableInput()');
      break;
    case '"Open_Door" BobsHouse.Door':
      doAction('SetNarration("The door is locked!")');
      doAction('ShowNarration()');
      break;
    case 'Key Cancel':
      doAction('HideNarration()');
      break;
    default:
  }
}

rl.on('line', (line) => {
  // TODO: this isn't working with Camelot. Not sure why.
  fs.appendFile(logfile, `Received: ${line}\n`, throwErr);

  // should be "input"
  const validateInput = line.substring(0, line.indexOf(" "));

  if(validateInput == "input") {
    // Process the rest of the message
    const msg = line.substring(line.indexOf(" ")+1);
    processMessage(msg);
  }

  // Otherwise ignore.
  
});

