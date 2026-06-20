import Fastify from 'fastify';

const server = Fastify({
  logger: {
    level: process.env['NODE_ENV'] === 'development' ? 'debug' : 'info',
  },
});

// Health check endpoint
server.get('/health', async () => {
  return { status: 'ok', service: 'agent' };
});

// Webhook endpoint for agent triggers
server.post('/webhook', async (request) => {
  server.log.info({ body: request.body }, 'Received webhook');
  return { received: true };
});

const start = async (): Promise<void> => {
  try {
    const port = Number.parseInt(process.env['AGENT_PORT'] ?? '3001', 10);
    const host = process.env['HOST'] ?? '0.0.0.0';

    await server.listen({ port, host });
    server.log.info(`Agent server listening on ${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
