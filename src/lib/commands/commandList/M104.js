const M104 = async (bot, gcodeObject) => {
  if (gcodeObject.args.s != undefined) {
    const newTemp = gcodeObject.args.s;
    bot.temperature.t.setpoint = newTemp;
  }
  return 'ok';
};

module.exports = M104;
