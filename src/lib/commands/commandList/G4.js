const delay = require('bluebird').delay;

const G4 = async (bot, gcodeObject) => {
  while (bot.bufferLength > 0) {
    await delay(10);
  }
  let delayAmount = 0;

  if (gcodeObject.args.s != undefined) {
    delayAmount = parseInt(gcodeObject.args.s * 1000, 10);
  } else if (gcodeObject.args.p != undefined) {
    delayAmount = parseInt(gcodeObject.args.p, 10);
  }

  await delay(delayAmount);
  return 'ok';
};

module.exports = G4;
