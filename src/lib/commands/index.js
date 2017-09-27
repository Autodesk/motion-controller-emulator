const fs = require('fs-promise');
const path = require('path');

function loadCommands() {
  const commands = {};
  try {
    const commandListDirectory = path.join(__dirname, 'commandList');
    fs.readdir(commandListDirectory)
    .then((fileArray) => {
      for (const file of fileArray) {
        const commandName = file.split('.js')[0];
        const commandFilePath = path.join(__dirname, `commandList/${file}`);
        commands[commandName] = require(commandFilePath);
      }
    });
  } catch (ex) {
    console.log('Load commands error', ex);
  }
  return commands;
}

module.exports = loadCommands();
