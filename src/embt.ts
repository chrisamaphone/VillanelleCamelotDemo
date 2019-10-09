import { execute } from "./villanelle";
import { exec } from "child_process";

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

function parseCommand(cmdString) {
    const firstOpenParen = cmdString.indexOf("(");
    if(firstOpenParen != -1) {
        const cmdName = cmdString.substring(0, firstOpenParen);
        const argsString:string = cmdString.substring(firstOpenParen+1, cmdString.indexOf(")"));
        const args:string[] = argsString.split(", ");
        return {name:cmdName, args:args};
    } else
    return {name:cmdString, args:[]}
}

let semantics = {} // Maps command names to functions

function startCamelotAction(command : string) {
    console.log('start ' + command); // Send to Camelot
    addToLog(`Sent: start ${command}\n`); // Log internally
}

type cont = () => void
enum Status {Success, Failure, Running}

interface Condition {
    id: number,
    cond: () => boolean,
    rest: BT
}

interface Sequence {
    id: number,
    children: BT[]
    type: "sequence"
}

interface Selector {
    id: number,
    children: BT[]
    type: "selector"
}

interface Action {
    id: number,
    command : string
}

type BT = Condition | Sequence | Selector | Action

let gensym = 0;

function makeAction(text:string) : BT {
    return {id: ++gensym, command: text};
}

function makeSelector(children:string[]) : BT {

    return {id: ++gensym, children:children.map((s) => makeAction(s)), type: "selector"};
}

function makeSequence(children:string[]) : BT {
    return {id: ++gensym, children:children.map((s) => makeAction(s)), type: "sequence"};
}

function makeCond(cond: () => boolean, rest:BT) : BT {
    return {id: ++gensym, cond:cond, rest: rest};
}

// Mutable dictionaries of callbacks
let onSuccess = {} 
let onFailure = {}

// Maps strings to ints
let commandTextToID = {}

function runAll(fs) {
    for(let i=0; i<fs.length; i++) {
        fs[i]();
    }
}

function addSuccessCallback(id, f) {
    if(onSuccess[id]) {
        onSuccess[id].push(f);
    } else {
        onSuccess[id] = [f];
    }
}

function addFailureCallback(id, f) {
    if(onFailure[id]) {
        onFailure[id].push(f);
    } else {
        onFailure[id] = [f];
    }
}

// BT semantics

function removeCallbacks(id : number) {
    onSuccess[id] = null;
    onFailure[id] = null;
}

function doAction(id:number, command : string) {
    startCamelotAction(command);

    commandTextToID[command] = id;

    function doSemantics() {
        //addToLog("Parsing command "+command);
        // console.log("Parsing command "+command);
        const {name, args} = parseCommand(command);
        addToLog("Name: "+name+", Args: ["+args+"]");
        if(semantics[name]) {
            semantics[name](args);
        } // N.B. the above returns a status. We could do something w/it.

    }  

    addSuccessCallback(id, doSemantics);
    
}

function doSequence(actions : BT[]) {
    if(actions.length > 0) {
        let first = actions[0];
        executeBT(first);
        if(actions.length > 1) {
            addSuccessCallback(first.id, 
                () => {
                        removeCallbacks(first.id);
                        doSequence(actions.slice(1));
                    }
                );
        } // End if something to do after this
        else {
            addSuccessCallback(first.id, () => { removeCallbacks(first.id); });
        }
        addFailureCallback(first.id, () => removeCallbacks(first.id));
        return Status.Running;
    } // End if action sequence nonempty
    else {
        return Status.Success;
    }
}

function doSelector(actions : BT[]) {
    if(actions.length > 0) {
        let first = actions[0];
        executeBT(first);
        onSuccess[first.id] = () => {
            removeCallbacks(first.id);
            return Status.Success;
        }
        if (actions.length > 1) {
            onFailure[first.id] = () => {
                removeCallbacks(first.id);
                doSelector(actions.slice(1));
            }
        } else {
            onFailure[first.id] = () => {
                removeCallbacks(first.id);
                return Status.Failure;
            }
        }
        return Status.Running;
    } else {
        return Status.Failure;
    }
}

function executeBT(script:BT) {
    if((script as Action).command) {
        const {command, id} = script as Action;
        addToLog("Executing action "+command);
        commandTextToID[command] = id;
        doAction(id, command);
        return Status.Running;
    }
    else if((script as Sequence).type == "sequence") {
        const {children, id, type} = script as Sequence;
        return doSequence(children);
    }
    else if((script as Selector).type == "selector") {
        const {children, id, type} = script as Selector;
        return doSelector(children);
    }
    else if((script as Condition).cond) {
        // addToLog("Executing condition");
        const {id, cond, rest} = script as Condition;
        return doCondition(cond, rest);
    } else {
        addToLog("Invalid BT");
        throw Error;
    }
}

function doCondition(cond : () => boolean, rest : BT) {
    if(cond()) {
        addToLog("Condition succeeded!");
        return executeBT(rest);
    } else {
        // addToLog("Condition failed");
        return Status.Failure;
    }
}

// Camelot stuff

function init() {
    startCamelotAction('CreatePlace(TheCamp, Camp)');

    // Locations: Barrel, ExitSign, Exit, Horse

    startCamelotAction('CreateCharacter(Sonia, F, 40)');
    startCamelotAction('ChangeClothing(Sonia, LightArmour)');
    startCamelotAction('SetPosition(Sonia, TheCamp.Stall)');
    startCamelotAction('SetHairStyle(Sonia, Spiky)');

    startCamelotAction('CreateCharacter(Bob, M, 25)');
    startCamelotAction('ChangeClothing(Bob, Peasant)');
    startCamelotAction('SetPosition(Bob, TheCamp.Firepit)');
    startCamelotAction('SetHairStyle(Bob, Spiky)');

    startCamelotAction('CreateCharacter(Robin, F, 25)');
    startCamelotAction('ChangeClothing(Robin, Merchant)');
    startCamelotAction('SetPosition(Robin, TheCamp.Exit)');
    startCamelotAction('SetHairStyle(Robin, Straight)');

    startCamelotAction('CreateItem(TheKey, Key)');
    startCamelotAction('SetPosition(TheKey, TheCamp.Stall)');

    // doAction('EnableIcon(Take, Take, TheTorch, "Take", true)');

    startCamelotAction('CreateItem(TheApple, Apple)');

    startCamelotAction('Game');
}

// Process "input" commands
function processInput(msg : string) {
    switch(msg) { 
    case 'Selected Start':
        addToLog("Player selected start");
        startCamelotAction('SetCameraFocus(Sonia)');
        startCamelotAction('EnableInput()');
        executePar(scripts);
        break;
    case 'Key Cancel':
            startCamelotAction('HideNarration()');
        break;
    default:
    }
}

// When receiving something from standard in (Camelot)
rl.on('line', (line) => {
    addToLog(`Received: ${line}\n`);

    // should be "input"
    const messageType = line.substring(0, line.indexOf(" "));

    if(messageType == "input") {
    // Process the rest of the message
    const msg = line.substring(line.indexOf(" ")+1);
    processInput(msg);
    }
    
    else if(messageType == "succeeded") {
        const finishedAction = line.substring(line.indexOf(" ")+1);
        addToLog(finishedAction+" succeeded.\n");
        const id = commandTextToID[finishedAction];
        // Look up what to do when this succeeds
        if(onSuccess[id]) {
            addToLog("Something to do in response to "+finishedAction+" succeeding");
            runAll(onSuccess[id]); // Run the functions if there is something to do
        } else {
            addToLog("Nothing to do in response to "+finishedAction+" succeeding");
        }
    } else if (messageType == "failed") {
        const finishedAction = line.substring(line.indexOf(" ")+1);
        addToLog(finishedAction+" failed.\n");
        const id = commandTextToID[finishedAction];
        if(onFailure[id]) {
            addToLog("Something to do in response to "+finishedAction+" failing");
            runAll(onFailure[id]); // Run the functions if there is something to do
        } else {
            addToLog("Nothing to do in response to "+finishedAction+" failing");
        }
    }
    // Otherwise ignore.
});


// Character Scripts

let whoHas = {
    "TheKey": null,
    "TheApple": null
}

function executeTake(args: string[]) : Status {
    if(args.length < 2) {throw Error;}

    const taker = args[0];
    const thing = args[1];

    if (whoHas[thing] != null) {
        addToLog("can't take, someone else has the thing");
        return Status.Failure;
    } else {
        whoHas[thing] = taker;
        addToLog("Now "+taker+" has "+thing);
        return Status.Success;
    }
}
semantics["Take"] = executeTake;

function executeGive(args : string[]) : Status {
    if(args.length != 3) {throw Error;}
    const giver = args[0];
    const thing = args[1];
    const rcvr = args[2];

    if (whoHas[thing] != giver) {
        addToLog("can't give because "+giver+" doesn't have "+thing);
        return Status.Failure;
    }

    whoHas[thing] = rcvr;
    addToLog("Now "+rcvr+" has "+thing);
    return Status.Success;
}

semantics["Give"] = executeGive;

// Robin's Script
// TODO: guard on Sonia walking up to her
const robinScript : BT =
makeSequence (
    [
        'WalkTo(Robin, TheCamp.Stall)',
        'Take(Robin, TheKey)',
        'WalkTo(Robin, Bob)',
        'Give(Robin, TheKey, Bob)',
        'WalkTo(Robin, TheCamp.Barrel)'
    ]
)

// Bob's Script
const bobScript = 
    makeCond(
        () => { return whoHas["TheKey"] == "Bob"; }, 
        makeSequence(
            [   'WalkTo(Bob, TheCamp.Horse)',
                'WalkTo(Bob, TheCamp.Chest)',
                'OpenFurniture(Bob, TheCamp.Chest)',
                'Take(Bob, TheApple, TheCamp.Chest)',
                'WalkTo(Bob, Sonia)',
                'Give(Bob, TheApple, Sonia)'
            ]
        )
    );

// Sonia's script
const soniaScript = 
    makeCond(
        () => {return whoHas["TheApple"] == "Sonia"; }, 
        makeAction('Pocket(Sonia, TheApple)'));

const scripts = [bobScript, soniaScript, robinScript];
let statusOf = {}

function executeOnFailure(BTs : BT[]) {
    addToLog("Executing all scripts from root.")
    let moreToDo = false;
    for(let i=0; i < BTs.length; i++) {
        if (statusOf[BTs[i].id] == Status.Failure) {
            // Try again
            statusOf[BTs[i].id] = executeBT(BTs[i]);
            moreToDo = true;
        } // Else, do nothing.
    }
    if(moreToDo) {
        setTimeout(() => executeOnFailure(BTs), 1000);
    }
}

function executePar(BTs : BT[]) {
    for(let i=0; i < BTs.length; i++) {
        statusOf[BTs[i].id] = executeBT(BTs[i]);
    }
    setTimeout(() => executeOnFailure(BTs), 1000)
}

// Top level
init();