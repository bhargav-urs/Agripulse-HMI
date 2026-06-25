import { DeviceSimulator } from './deviceSimulator';

const simulator = new DeviceSimulator();
simulator.start();

const shutdown = (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received - stopping simulator`);
  simulator.stop();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
