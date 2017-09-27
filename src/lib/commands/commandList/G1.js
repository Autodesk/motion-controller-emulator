const G1 = async (bot, gcodeObject) => {
  // TODO: account for relative or absolute mode
  // TODO: add ability to read new feedrates
  // TODO: add proper feedrate handling when moving multiple axes simultaneously
  bot.position.x.latest = gcodeObject.args.x == undefined ? bot.position.x.latest : gcodeObject.args.x;
  bot.position.y.latest = gcodeObject.args.y == undefined ? bot.position.y.latest : gcodeObject.args.y;
  bot.position.z.latest = gcodeObject.args.z == undefined ? bot.position.z.latest : gcodeObject.args.z;
  bot.position.e.latest = gcodeObject.args.e == undefined ? bot.position.e.latest : gcodeObject.args.e;

  return 'ok';
};

module.exports = G1;
