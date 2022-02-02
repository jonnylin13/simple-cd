const fastify = require('fastify')({ logger: true });
require('dotenv').config();
const crypto = require('crypto');
const config = require('./config.json');
const { exec } = require('child_process');

fastify.register(require('fastify-cors'), {});
fastify.register(require('fastify-raw-body'));

fastify.get('/', async (request, reply) => {
  return reply.status(403).send();
});

async function runBuild() {
  exec(`${config.build}`, (error, stdout, stderr) => {
    if (error) {
      fastify.log.error(stderr);
      return false;
    }
    fastify.log.info(stdout);
    return true;
  });
}

fastify.post('/simple-cd', async (request, reply) => {
  if (!('x-hub-signature-256' in request.headers)) return reply.status(403).send();
  const signature = Buffer.from(request.headers['x-hub-signature-256'] || '', 'utf-8');

  const hmac = crypto.createHmac('sha256', process.env.SECRET);
  const digest = Buffer.from(`sha256=${hmac.update(JSON.stringify(request.body)).digest('hex')}`, 'utf-8');

  if (signature.length !== digest.length || !crypto.timingSafeEqual(digest, signature)) return reply.status(403).send();

  const result = await runBuild();
  if (!result) return reply.status(500).send();
  return reply.status(200).send();
});

fastify.listen(process.env.PORT, process.env.ADDRESS, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`simple-ci server is on!`);
})