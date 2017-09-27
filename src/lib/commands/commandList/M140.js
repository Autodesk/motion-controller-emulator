const M140 = async (bot, gcodeObject) => {
  if (gcodeObject.args.s != undefined) {
    const newTemp = gcodeObject.args.s;
    bot.temperature.b.setpoint = newTemp;
  }

  return 'ok';
};

module.exports = M140;
