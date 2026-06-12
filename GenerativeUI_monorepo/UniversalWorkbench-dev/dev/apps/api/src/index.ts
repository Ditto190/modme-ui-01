import { buildServer } from './server.js';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const HOST = process.env['HOST'] ?? '0.0.0.0';

const server = await buildServer();

// Graceful shutdown
const shutdown = async (): Promise<void> => {
  server.log.info('Shutting down gracefully...');
  await server.close();
  // Drizzle with postgres-js doesn't need explicit disconnect
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
try {
  await server.listen({ port: PORT, host: HOST });
  server.log.info(`🚀 API server running at http://${HOST}:${PORT}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
