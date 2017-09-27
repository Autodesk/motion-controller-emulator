// We're expecting a reply string something like this
// ok X:0.00 Y:0.00 Z:0.00 E:0.00 Count X:0.00 Y:0.00 Z:0.00 E0.00';
const M114 = async (bot) => {
  const currentPosition =
    `X:${bot.position.x.latest.toFixed(2)} ` +
    `Y:${bot.position.y.latest.toFixed(2)} ` +
    `Z:${bot.position.z.latest.toFixed(2)} ` +
    `E:${bot.position.e.latest.toFixed(2)} `;

  const movingPosition = 'Count ' +
    `X:${bot.position.x.actual.toFixed(2)} ` +
    `Y:${bot.position.y.actual.toFixed(2)} ` +
    `Z:${bot.position.z.actual.toFixed(2)} ` +
    `E:${bot.position.e.actual.toFixed(2)}`;

  return `ok ${currentPosition}${movingPosition}`;
};

module.exports = M114;
