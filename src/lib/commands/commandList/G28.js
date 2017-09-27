const delay = require('bluebird').delay;

const G28 = async (bot, gcodeObject) => {
  let axisArray = [];
  const availableAxes = ['x', 'y', 'z'];

  for (const axis of availableAxes) {
    if (gcodeObject.args[axis]) {
      axisArray.push(axis);
    }
  }

  // If no args are passed, make sure that we home every axis
  if (axisArray.length === 0) {
    axisArray = availableAxes;
  }

  // Don't process homing command until the motion buffer is complete
  while (bot.commandBuffer.length > 0) {
    await delay(10);
  }

  for (const axis of axisArray) {
    const axisObject = bot.position[axis];
    axisObject.setpoint = 0;
    axisObject.actual = 0;
    axisObject.latest = 0;
  }

  return 'ok';
};

module.exports = G28;
