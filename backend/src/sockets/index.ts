import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { NAMESPACES } from '../constants/events';
import { env } from '../config/env';
import { createLogger } from '../lib/logger';
import { socketHub } from './socketHub';
import { registerMobileGateway } from './mobile.gateway';
import { registerDeviceGateway } from './device.gateway';

const log = createLogger('socket');

/** Create the Socket.IO server, wire both namespaces, and return the instance. */
export function initSockets(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigin, methods: ['GET', 'POST'] },
    pingInterval: 10_000,
    pingTimeout: 20_000,
  });

  const mobileNs = io.of(NAMESPACES.MOBILE); // default namespace
  const deviceNs = io.of(NAMESPACES.DEVICE);

  socketHub.init(io, mobileNs, deviceNs);
  registerMobileGateway(mobileNs);
  registerDeviceGateway(deviceNs);

  log.info('Socket.IO initialised (namespaces: / [mobile], /device)');
  return io;
}
