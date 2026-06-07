const http = require('http');

const gatewayHost = 'localhost';
const gatewayPort = 8100;

function requestJson(method, pathname, body) {
  const payload = body ? JSON.stringify(body) : null;
  const options = {
    host: gatewayHost,
    port: gatewayPort,
    path: pathname,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = data ? JSON.parse(data) : data;
        } catch (error) {
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  const testCpf = `91${String(Date.now()).slice(-9)}`.slice(0, 11);
  console.log('CPF de teste:', testCpf);

  const tests = [
    {
      name: 'GET /admin/lockers',
      fn: () => requestJson('GET', '/admin/lockers'),
    },
    {
      name: 'GET /admin/condominos',
      fn: () => requestJson('GET', '/admin/condominos'),
    },
    {
      name: 'POST /admin/lockers',
      fn: () => requestJson('POST', '/admin/lockers', {
        codigo: 1234,
        cep: '88040480',
        numero_cep: 12345,
        complemento: 'Bloco A',
        gavetas: { P: 1, M: 1, G: 0, GG: 0 },
      }),
    },
    {
      name: 'POST /admin/condominos',
      fn: () => requestJson('POST', '/admin/condominos', {
        cpf: testCpf,
        nome: 'Teste Usuario',
        telefone: '11999990000',
        cep: '88040480',
        numero_cep: 101,
        complemento: 'Apartamento 1',
      }),
    },
    {
      name: 'POST /entregador/entregar',
      fn: () => requestJson('POST', '/entregador/entregar', {
        cpf: testCpf,
        locker: 123,
        numero_gaveta: 1,
        data_entrega: new Date().toISOString(),
      }),
    },
    {
      name: 'GET /condomino/:cpf/entregas',
      fn: () => requestJson('GET', `/condomino/${testCpf}/entregas`),
    },
    {
      name: 'GET /condomino/:cpf/gavetas',
      fn: () => requestJson('GET', `/condomino/${testCpf}/gavetas`),
    },
    {
      name: 'DELETE /condomino/:cpf/recolher',
      fn: () => requestJson('DELETE', `/condomino/${testCpf}/recolher`),
    },
    {
      name: 'GET /admin/logs/:cpf',
      fn: () => requestJson('GET', `/admin/logs/${testCpf}`),
    },
  ];

  for (const test of tests) {
    process.stdout.write(`Executando ${test.name}... `);
    try {
      const result = await test.fn();
      const status = result.status;
      const ok = status >= 200 && status < 300;
      console.log(ok ? 'OK' : `FALHA (${status})`);
      console.log(JSON.stringify(result.body, null, 2));
      if (!ok) {
        console.log(`Teste ${test.name} falhou com status ${status}. Encerrando.`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Erro no teste ${test.name}:`, error.message || error);
      process.exit(1);
    }
  }

  console.log('Todos os testes do gateway foram executados.');
}

run().catch((error) => {
  console.error('Erro inesperado:', error);
  process.exit(1);
});