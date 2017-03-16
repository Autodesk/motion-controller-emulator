const M109 = async (bot, gcodeObject) => {
  gcodeObject.args.forEach((arg) => {
    if (arg.indexOf('S') !== -1) {
      const newTemp = parseFloat(Number(arg.split('S')[1]).toFixed(1));
      bot.temperature.b.setpoint = newTemp;
      bot.mode.blocking = true;

      // Periodically check if the temerature is reached
      // As soon as the temp is reached, clear the block
      const checkM190 = setInterval(() => {
        if (bot.temperature.b.setpoint === bot.temperature.b.actual) {
          bot.mode.blocking = false;
          clearInterval(checkM190);
        }
      }, 100);
    }
  });
  return 'ok';
};

module.exports = M109;
