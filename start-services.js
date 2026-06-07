const path = require('path');
const { spawn } = require('child_process');

const services = [
  { name: 'condomino_service', script: 'condomino_service.js', cwd: 'condomino_service' },
  { name: 'entrega_service', script: 'entrega_service.js', cwd: 'entrega_service' },
  { name: 'locker_service', script: 'locker_service.js', cwd: 'locker_service' },
  { name: 'logger_service', script: 'logger_service.js', cwd: 'logger_service' },
  { name: 'abertura_service', script: 'abertura.js', cwd: 'abertura' },
  { name: 'gateway', script: 'gateway.js', cwd: 'gateway' },
];

const children = [];

console.log('Iniciando todos os serviços...');
console.log('Certifique-se de ter executado npm install em cada pasta de serviço antes.');

for (const service of services) {
  const servicePath = path.join(__dirname, service.cwd);
  const child = spawn('node', [service.script], {
    cwd: servicePath,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(`[${service.name}] ${data}`);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(`[${service.name}][ERROR] ${data}`);
  });

  child.on('exit', (code, signal) => {
    console.log(`[${service.name}] finalizou com código ${code}${signal ? ` e sinal ${signal}` : ''}`);
  });

  children.push(child);
}

function shutdown() {
  console.log('\nInterrompendo serviços...');
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }
  process.exit();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
