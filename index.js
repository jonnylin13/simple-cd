const fastify = require('fastify')({ logger: true });
require('dotenv').config();
const crypto = require('crypto');
const config = require('./config.json');
const { exec } = require('child_process');

fastify.register(require('fastify-cors'), {});
fastify.register(require('fastify-raw-body'));

fastify.get('/simple-cd', async (request, reply) => {
  return reply.status(403).send();
});

function runBuild(body) {
  return new Promise((resolve, reject) => {
    const cfg = config.push.find(push => {
      return push.ref === body.ref && push.name === body.repository.name;
    });
    if (!cfg) {
      fastify.log.info('No matching configuration found');
      resolve();
      return;
    }
    exec(`${cfg.build}`, (error, stdout, stderr) => {
      if (error) {
        fastify.log.error(stderr);
        reject();
        return;
      }
      fastify.log.info(stdout);
      resolve();
      return;
    });
  });
}

fastify.post('/simple-cd', async (request, reply) => {
  if (!('x-hub-signature-256' in request.headers)) return reply.status(403).send();
  const signature = Buffer.from(request.headers['x-hub-signature-256'] || '', 'utf-8');

  const hmac = crypto.createHmac('sha256', process.env.SECRET);
  const digest = Buffer.from(`sha256=${hmac.update(JSON.stringify(request.body)).digest('hex')}`, 'utf-8');

  if (signature.length !== digest.length || !crypto.timingSafeEqual(digest, signature)) return reply.status(403).send();

  try {
    await runBuild(request.body);
    return reply.status(200).send();
  } catch {
    return reply.status(500).send();
  }
});

fastify.listen(process.env.PORT, process.env.ADDRESS, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`simple-ci server is on!`);
})