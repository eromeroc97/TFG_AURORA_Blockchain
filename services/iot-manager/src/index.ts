import Fastify from 'fastify';

export const buildApp = () => {
  const app = Fastify({ logger: true });

  app.get('/health', async () => {
    return {
      status: 'UP',
      service: 'iot-manager',
    };
  });

  return app;
};

const start = async () => {
  const app = buildApp();
  try {
    await app.listen({
      port: 3002,
      host: '0.0.0.0',
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  void start();
}
