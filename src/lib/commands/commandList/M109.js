const M109 = async (bot, gcodeObject) => {
  if (gcodeObject.args.s != undefined) {
    const newTemp = gcodeObject.args.s;
    bot.temperature.t.setpoint = newTemp;
    bot.mode.blocking = true;

    // Periodically check if the temerature is reached
    // As soon as the temp is reached, clear the block
    const checkM109 = setInterval(() => {
      if (bot.temperature.t.setpoint === bot.temperature.t.actual) {
        bot.mode.blocking = false;
        clearInterval(checkM109);
      }
    }, 100);
  }

  return 'ok';
};

module.exports = M109;
