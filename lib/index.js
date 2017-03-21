const _ = require('lodash');
const delay = require('bluebird').delay;
const equal = require('deep-equal');
const EventEmitter = require('events');

const gcodeToObject = require('gcode-json-converter').gcodeToObject;

const commands = require('./commands');

class MCE extends EventEmitter {
  constructor() {
    super();

    this.state = {
      open: false,
    };

    this.mode = {
      absolute: true,
      blocking: false,
    };

    this.commandBuffer = [];
    this.commandBufferMaxLength = 32;

    this.temperature = {
      t: {
        setpoint: 0,
        actual: 0,
      },
      b: {
        setpoint: 0,
        actual: 0,
      },
    };

    // setpoint    - The position that the motion buffer is moving towards.
    //               This represents the destination of the first command in line to be executed
    // actual      - The actual gantry position
    // latest      - The final known position,
    //               aka once the entire motion buffer is consumed, where the gantry will be located
    // feedrate    - The rate of motion in mm / second
    // maxFeedrate - Limit the feedrate to be below a certain value
    this.position = {
      x: {
        setpoint: 0,
        actual: 0,
        latest: 0,
        feedrate: 2000,
        maxFeedrate: 3000,
      },
      y: {
        setpoint: 0,
        actual: 0,
        latest: 0,
        feedrate: 2000,
        maxFeedrate: 3000,
      },
      z: {
        setpoint: 0,
        actual: 0,
        latest: 0,
        feedrate: 2000,
        maxFeedrate: 3000,
      },
      e: {
        setpoint: 0,
        actual: 0,
        latest: 0,
        feedrate: 100,
        maxFeedrate: 200,
      },
    };

    // We're updating the position and the temperature 10 times per second.
    setInterval(this.simulateMotionBuffer.bind(this), 100);
    setInterval(this.simulateTemperature.bind(this), 100);
  }

  async open() {
    if (!this.state.open) {
      await delay(100);
      this.state.open = true;
    }
  }

  async close() {
    if (this.state.open) {
      await delay(100);
      this.state.open = false;
    }
  }

  async sendGcode(gcode) {
    if (this.state.open) {
      // Don't send gcode until there is space in the buffer
      while (this.commandBuffer.length > this.commandBufferMaxLength || this.mode.blocking) {
        await delay(10);
      }

      const gcodeObject = gcodeToObject(gcode);
      this.commandBuffer.push(gcodeObject);
      const gcodeReply = await this.processCommand(gcodeObject);
      this.emit('reply', gcodeReply);

      return gcodeReply;
    }
    return 'Cannot send gcode. Port is not open';
  }

  async processCommand(gcodeObject) {
    let reply = '';
    // Check if the desired command exists
    const commandFunction = commands[gcodeObject.command];
    if (commandFunction != undefined && typeof commandFunction === 'function') {
      reply = await commandFunction(this, gcodeObject);
    }
    return reply;
  }

  // Move an object towards the desired setpoint by an increment
  // but don't overshoot the target value
  increment(object, incrementAmount) {
    if (object.setpoint !== object.actual) {
      if (object.setpoint < object.actual) {
        if (object.actual - object.setpoint < incrementAmount) {
          object.actual = object.setpoint;
        } else {
          object.actual -= incrementAmount;
        }
      } else {
        if (object.setpoint - object.actual < incrementAmount) {
          object.actual = object.setpoint;
        } else {
          object.actual += incrementAmount;
        }
      }
    }
  }

  async simulateTemperature() {
    const incrementAmount = 10;
    _.entries(this.temperature).forEach(([key, value]) => {
      this.increment(value, incrementAmount);
    });
  }

  simulateMotionBuffer() {
    if (this.commandBuffer.length > 0) {
      _.entries(this.position).forEach(([key, value]) => {
        // Turning the feedrate (mm/min) into (mm/s)
        // then (mm/s) * 1s / 10 one hundreths of a second
        // Since we are updating the position once every 100 milliseconds,
        // this will be our increment value
        const incrementAmount = (value.feedrate / 60) / 10;
        this.increment(value, incrementAmount);
      });

      // check the first command
      // once the command is completed, then remove it from the buffer
      this.processBufferCommand(this.commandBuffer[0]);
    }
  }

  updatePositionSetpoints(gcodeObject) {
    const axisArray = ['x', 'y', 'z', 'e'];

    axisArray.forEach(axis => {
      if (gcodeObject.args[axis] != undefined) {
        const axisPosition = gcodeObject.args[axis];
        this.position[axis].setpoint = axisPosition;
      }
    });
  }

  processBufferCommand(gcodeObject) {
    switch (gcodeObject.command) {
      case 'G1': {
        this.updatePositionSetpoints(gcodeObject);
        const positionSetpoint = {
          x: this.position.x.setpoint,
          y: this.position.y.setpoint,
          z: this.position.z.setpoint,
          e: this.position.e.setpoint,
        };
        // if current position == destination then ditch the command
        // else set the new position
        const positionActual = {
          x: this.position.x.actual,
          y: this.position.y.actual,
          z: this.position.z.actual,
          e: this.position.e.actual,
        };

        if (equal(positionActual, positionSetpoint)) {
          this.commandBuffer.shift();
        }
        break;
      }
      default: {
        this.commandBuffer.shift();
        break;
      }
    }
  }
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught error', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection', { reason, promise });
});

module.exports = MCE;
