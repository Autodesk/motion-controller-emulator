/* global it, describe */
const assert = require('chai').assert;
const LineByLineReader = require('line-by-line');
const delay = require('bluebird').delay;
const path = require('path');

const MCE = require('../dist');

describe('Testing Motion Controller Emulator functionality', () => {
  const bot = new MCE();

  it('Has to be opened before it can process anything', async () => {
    const reply = await bot.sendGcode('M114');
    await bot.open();
    const reply2 = await bot.sendGcode('M114');
  });

  it('Has an initial position of X=0, Y=0, Z=0, E=0', async () => {
    const position = {
      x: bot.position.x.setpoint,
      y: bot.position.y.setpoint,
      z: bot.position.z.setpoint,
      e: bot.position.e.setpoint,
    };

    const expectedPositon = {
      x: 0,
      y: 0,
      z: 0,
      e: 0,
    };

    assert.deepEqual(position, expectedPositon);
  });

  it('Processes an M114 command', async () => {
    const reply = await bot.sendGcode('M114');
    const expectedReply = 'ok X:0.00 Y:0.00 Z:0.00 E:0.00 Count X:0.00 Y:0.00 Z:0.00 E:0.00';
    assert.equal(reply, expectedReply);
  });

  it('Has a position of X=10, Y=0, Z=0, E=0 after sent GCode "G1 X10"', async () => {
    await bot.sendGcode('G1 X10');
    const position = {
      x: bot.position.x.latest,
      y: bot.position.y.latest,
      z: bot.position.z.latest,
      e: bot.position.e.latest,
    };

    const expectedPosition = {
      x: 10,
      y: 0,
      z: 0,
      e: 0,
    };

    assert.deepEqual(position, expectedPosition);
  });

  it('Processes an M114 command after a move', async () => {
    const reply = await bot.sendGcode('M114');
    const expectedReply = 'ok X:10.00 Y:0.00 Z:0.00 E:0.00 Count X:0.00 Y:0.00 Z:0.00 E:0.00';
    assert.equal(reply, expectedReply);
  });

  it('Processes an M114 command after a move has completed', async () => {
    // This is an arbitrary delay
    // should be replaced with a delay appropriate for the distance traveled and feedrate
    await delay(1000);
    const reply = await bot.sendGcode('M114');
    const expectedReply = 'ok X:10.00 Y:0.00 Z:0.00 E:0.00 Count X:10.00 Y:0.00 Z:0.00 E:0.00';
    assert.equal(reply, expectedReply);
  });

  it('Processes an M105 command', async () => {
    const reply = await bot.sendGcode('M105');
    const expectedReply = 'ok T:0.0 /0.0 B:0.0 /0.0';
    assert.equal(reply, expectedReply);
  });

  it('Processes an M104 command', async () => {
    const reply1 = await bot.sendGcode('M104 S100');
    const expectedReply1 = 'ok';
    assert.equal(reply1, expectedReply1);

    const reply2 = await bot.sendGcode('M105');
    const expectedReply2 = 'ok T:0.0 /100.0 B:0.0 /0.0';
    assert.equal(reply2, expectedReply2);
  });

  it('Should raise nozzle temp', async () => {
    await delay(200);
    const currentNozzleTemp = bot.temperature.t.actual;
    assert.equal(currentNozzleTemp > 0, true);
  });

  it('Processes an M140 command', async () => {
    const reply1 = await bot.sendGcode('M140 S50');
    const expectedReply1 = 'ok';
    assert.equal(reply1, expectedReply1);

    const reply2 = await bot.sendGcode('M105');
    const bedInfo = reply2.split('B')[1];
    const expectedBedInfo = ':0.0 /50.0';
    assert.equal(bedInfo, expectedBedInfo);
  });

  it('Should raise bed temp', async () => {
    await delay(200);
    const currentBedTemp = bot.temperature.b.actual;
    assert.equal(currentBedTemp > 0, true);
  });

  it('Processes an M109 command', async () => {
    // Note the nozzle is currently set at 100
    const reply = await bot.sendGcode('M109 S200');
    const expectedReply = 'ok';
    assert.equal(reply, expectedReply);

    // When an M109 command is sent, expect execution of the motion buffer to be suspended
    const startTime = new Date().getTime();
    const reply2 = await bot.sendGcode('M105');
    const endTime = new Date().getTime();
    const passedTime = endTime - startTime;
    // Expect heating the bed to take time, and to not get a reply until the M109 command is complete
    assert.equal(passedTime > 200, true);

    const nozzleInfo = reply2.split('T')[1].split('B')[0];
    const expectedNozzleInfo = ':200.0 /200.0 ';
    assert.equal(nozzleInfo === expectedNozzleInfo, true);
    // As soon as the desired temperature is reached, the block should be removed
  });

  it('Processes an M190 command', async () => {
    // Note the bed is currently set at 50
    const reply = await bot.sendGcode('M190 S100');
    const expectedReply = 'ok';
    assert.equal(reply, expectedReply);

    // When an M190 command is sent, expect execution of the motion buffer to be suspended
    const startTime = new Date().getTime();
    const reply2 = await bot.sendGcode('M105');
    const endTime = new Date().getTime();
    const passedTime = endTime - startTime;
    // Expect heating the bed to take time, and to not get a reply until the M190 command is complete
    assert.equal(passedTime > 200, true);

    const bedInfo = reply2.split('B')[1];
    const expectedBedInfo = ':100.0 /100.0';
    assert.equal(bedInfo === expectedBedInfo, true);
    // As soon as the desired temperature is reached, the block should be removed
  });

  it('Processes an M400 command', async () => {
    // We're moving from X10 back to X20, which should take some time, before the M400 replys
    await bot.sendGcode('G1 X20');
    const startTime = new Date().getTime();
    await bot.sendGcode('M400');
    const endTime = new Date().getTime();
    const passedTime = endTime - startTime;
    assert.equal(passedTime > 500, true);
  });

  it('Processes a G28 X command', async () => {
    // query the initial position
    await bot.sendGcode('G1 X10 Y10 Z10');
    const replyM114 = await bot.sendGcode('M114');

    // assert that it is not zero
    const homeLocation = 'ok X:0.00 Y:0.00 Z:0.00 E:0.00';
    assert.equal(replyM114.includes(homeLocation), false);

    // send G28 command
    const replyG28 = await bot.sendGcode('G28 X');
    assert.equal(replyG28, 'ok');

    // assert that the axes have been zero'd
    const replyM114again = await bot.sendGcode('M114');
    const expectedM114String = 'ok X:0.00 Y:10.00 Z:10.00 E:0.00 Count X:0.00 Y:10.00 Z:10.00 E:0.00';
    assert.equal(replyM114again, expectedM114String);
  });

  it('Processes a G28 Y command', async () => {
    // query the initial position
    await bot.sendGcode('G1 X10 Y10 Z10');
    const replyM114 = await bot.sendGcode('M114');

    // assert that it is not zero
    const homeLocation = 'ok X:0.00 Y:0.00 Z:0.00 E:0.00';
    assert.equal(replyM114.includes(homeLocation), false);

    // send G28 command
    const replyG28 = await bot.sendGcode('G28 Y');
    assert.equal(replyG28, 'ok');

    // assert that the axes have been zero'd
    const replyM114again = await bot.sendGcode('M114');
    const expectedM114String = 'ok X:10.00 Y:0.00 Z:10.00 E:0.00 Count X:10.00 Y:0.00 Z:10.00 E:0.00';
    assert.equal(replyM114again, expectedM114String);
  });

  it('Processes a G28 Z command', async () => {
    // query the initial position
    await bot.sendGcode('G1 X10 Y10 Z10');
    const replyM114 = await bot.sendGcode('M114');

    // assert that it is not zero
    const homeLocation = 'ok X:0.00 Y:0.00 Z:0.00 E:0.00';
    assert.equal(replyM114.includes(homeLocation), false);

    // send G28 command
    const replyG28 = await bot.sendGcode('G28 Z');
    assert.equal(replyG28, 'ok');

    // assert that the axes have been zero'd
    const replyM114again = await bot.sendGcode('M114');
    const expectedM114String = 'ok X:10.00 Y:10.00 Z:0.00 E:0.00 Count X:10.00 Y:10.00 Z:0.00 E:0.00';
    assert.equal(replyM114again, expectedM114String);
  });

  it('Processes a G28 X Y command', async () => {
    // query the initial position
    await bot.sendGcode('G1 X10 Y10 Z10');
    const replyM114 = await bot.sendGcode('M114');

    // assert that it is not zero
    const homeLocation = 'ok X:0.00 Y:0.00 Z:0.00 E:0.00';
    assert.equal(replyM114.includes(homeLocation), false);

    // send G28 command
    const replyG28 = await bot.sendGcode('G28 X Y');
    assert.equal(replyG28, 'ok');

    // assert that the axes have been zero'd
    const replyM114again = await bot.sendGcode('M114');
    const expectedM114String = 'ok X:0.00 Y:0.00 Z:10.00 E:0.00 Count X:0.00 Y:0.00 Z:10.00 E:0.00';
    assert.equal(replyM114again, expectedM114String);
  });

  it('Processes a G28 X Z command', async () => {
    // query the initial position
    await bot.sendGcode('G1 X10 Y10 Z10');
    const replyM114 = await bot.sendGcode('M114');

    // assert that it is not zero
    const homeLocation = 'ok X:0.00 Y:0.00 Z:0.00 E:0.00';
    assert.equal(replyM114.includes(homeLocation), false);

    // send G28 command
    const replyG28 = await bot.sendGcode('G28 X Z');
    assert.equal(replyG28, 'ok');

    // assert that the axes have been zero'd
    const replyM114again = await bot.sendGcode('M114');
    const expectedM114String = 'ok X:0.00 Y:10.00 Z:0.00 E:0.00 Count X:0.00 Y:10.00 Z:0.00 E:0.00';
    assert.equal(replyM114again, expectedM114String);
  });

  it('Processes a G28 Y Z command', async () => {
    // query the initial position
    await bot.sendGcode('G1 X10 Y10 Z10');
    const replyM114 = await bot.sendGcode('M114');

    // assert that it is not zero
    const homeLocation = 'ok X:0.00 Y:0.00 Z:0.00 E:0.00';
    assert.equal(replyM114.includes(homeLocation), false);

    // send G28 command
    const replyG28 = await bot.sendGcode('G28 Y Z');
    assert.equal(replyG28, 'ok');

    // assert that the axes have been zero'd
    const replyM114again = await bot.sendGcode('M114');
    const expectedM114String = 'ok X:10.00 Y:0.00 Z:0.00 E:0.00 Count X:10.00 Y:0.00 Z:0.00 E:0.00';
    assert.equal(replyM114again, expectedM114String);
  });

  it('Processes a G28 command', async () => {
    // query the initial position
    await bot.sendGcode('G1 X10 Y10 Z10');
    const replyM114 = await bot.sendGcode('M114');

    // assert that it is not zero
    const homeLocation = 'ok X:0.00 Y:0.00 Z:0.00 E:0.00';
    assert.equal(replyM114.includes(homeLocation), false);

    // send G28 command
    const replyG28 = await bot.sendGcode('G28');
    assert.equal(replyG28, 'ok');

    // assert that the axes have been zero'd
    const replyM114again = await bot.sendGcode('M114');
    const expectedM114String = 'ok X:0.00 Y:0.00 Z:0.00 E:0.00 Count X:0.00 Y:0.00 Z:0.00 E:0.00';
    assert.equal(replyM114again, expectedM114String);
  });

  it('Processes a G4 command with a "seconds" or "S" parameter', async () => {
    const startTime = new Date().getTime();
    await bot.sendGcode('G4 S1');
    const endTime = new Date().getTime();
    const passedTime = endTime - startTime;
    assert(passedTime >= 1000, true);
    assert(passedTime < 1500, true);
  });

  it('Processes a G4 command with a "milliseconds" or "P" parameter', async () => {
    const startTime = new Date().getTime();
    await bot.sendGcode('G4 P100');
    const endTime = new Date().getTime();
    const passedTime = endTime - startTime;
    assert(passedTime >= 100, true);
    assert(passedTime < 150, true);
  });

  it('shouldnt queue commands when the buffer is full', async () => {
    await bot.sendGcode('M400');
    const startTime = new Date().getTime();
    // Fill the buffer
    for (let i = 0; i < 35; i += 1) {
      await bot.sendGcode('G1 X0');
    }
    const endTime = new Date().getTime();
    const passedTime = endTime - startTime;
    assert.isAtLeast(passedTime, 100);
  });

  it('should be able to consume a small gcode file', function (done) {
    this.timeout(20000);
    // The file provided is a 1mm cube, sliced for a Printrbot Play

    // declare the gcode file path
    const filePath = path.join(process.env.PWD, 'tests/cube.gcode');
    // instantiate the line reader
    const lr = new LineByLineReader(filePath);

    // build the event handler for processing each line
    lr.on('line', async (line) => {
      const command = line.split(';')[0];
      if (command.length <= 0) {
        return;
      }
      lr.pause();
      const reply = await bot.sendGcode(line);
      lr.resume();
    });
    lr.on('end', () => {
      done();
    });
  });
});
