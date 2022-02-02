const fastify = require('fastify')({ logger: true });
require('dotenv').config();
const crypto = require('crypto');

fastify.register(require('fastify-cors'), {});
fastify.register(require('fastify-raw-body'));

fastify.get('/', async (request, reply) => {
  return reply.status(403).send();
});

fastify.post('/github', async (request, reply) => {
  if (!('X-Hub-Signature-256' in request.headers)) return reply.status(403).send();
  const signature = Buffer.from(request.headers['X-Hub-Signature-256'] || '', 'utf-8');
  const hmac = crypto.createHmac('sha256', process.env.SECRET);
  const digest = Buffer.from(`sha256=${hmac.update(request.rawBody).digest('hex')}`, 'utf-8');
  if (signature.length !== digest.length || !crypto.timingSafeEqual(digest, signature)) return reply.status(403).send();

  console.log(JSON.stringify(request.body, null, 2));
  return reply.status(200).send();
});

fastify.listen(process.env.PORT, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`simple-ci server is listening on ${address}`);
})