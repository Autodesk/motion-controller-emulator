// We're expecting a reply string something like this
// ok T:0.0 /0.0 B:0.0 /0.0
const M105 = async (bot) => {
  const tActual = bot.temperature.t.actual.toFixed(1);
  const tSetpoint = bot.temperature.t.setpoint.toFixed(1);
  const bActual = bot.temperature.b.actual.toFixed(1);
  const bSetpoint = bot.temperature.b.setpoint.toFixed(1);
  return `ok T:${tActual} /${tSetpoint} B:${bActual} /${bSetpoint}`;
};

module.exports = M105;
