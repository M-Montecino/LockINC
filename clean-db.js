const fs = require('fs');
const path = require('path');

const services = [
  'condomino_service',
  'entrega_service',
  'logger_service',
  'locker_service',
  'abertura'
];

console.log('Apagando arquivos .db...\n');

services.forEach(service => {
  const dbPath = path.join(__dirname, service, 'dados.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log(`✓ Deletado: ${service}/dados.db`);
  } else {
    console.log(`- Não encontrado: ${service}/dados.db`);
  }
});

console.log('\nConcluído!');
