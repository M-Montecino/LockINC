const express = require('express');
const app = express();
const sqlite3 = require('sqlite3');
const axios = require('axios');

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const ABERTURA_SERVICE = 'http://localhost:8120';
const LOCKER_SERVICE = 'http://localhost:8110';
const CONDOMINO_SERVICE = 'http://localhost:8080';

// Inicia o Servidor na porta 8090
let porta = 8090;
app.listen(porta, () => {
 console.log('Servidor em execução na porta: ' + porta);
});

// Acessa o arquivo com o banco de dados
var db = new sqlite3.Database('./dados.db', (err) => {
        if (err) {
            console.log('ERRO: não foi possível conectar ao SQLite.');
            throw err;
        }
        db.run('PRAGMA foreign_keys = ON');
        console.log('Conectado ao SQLite!');
    });

//DB
db.run(`CREATE TABLE IF NOT EXISTS entregas
        (id INTEGER PRIMARY KEY AUTOINCREMENT,
        cpf numeric[11] NOT NULL UNIQUE,
        locker INTEGER NOT NULL,
        numero_gaveta INTEGER NOT NULL,
        data_entrega DATETIME NOT NULL,
        UNIQUE(locker, numero_gaveta))`, 
    [], (err) => {
        if (err) {
            console.log('ERRO: não foi possível criar tabela.');
              throw err;
        }
});

// POST
app.post('/entregas', async (req, res) => {
    const { cpf, locker, numero_gaveta, data_entrega } = req.body;

    if (!cpf || !locker || !numero_gaveta || !data_entrega) {
        return res.status(400).send('Dados incompletos. Por favor, forneça CPF, locker, número da gaveta e data de entrega.');
    }
    if (cpf.length !== 11) {
        return res.status(400).send('CPF deve conter exatamente 11 dígitos.');
    }

    try {
        // Verifica se o CPF é um condômino válido
        const condominoResult = await axios.get(`${CONDOMINO_SERVICE}/condominos/${cpf}`,
            { validateStatus: () => true }
        );

        if (condominoResult.status === 404) {
            return res.status(404).send('CPF não cadastrado como condômino no sistema.');
        }

        // Verifica se o locker e a gaveta existem
        const gacetasResult = await axios.get(`${LOCKER_SERVICE}/lockers/${locker}/gavetas`, 
            { validateStatus: () => true }
        );

        if (gacetasResult.status === 404) {
            return res.status(404).send('Locker não encontrado');
        }

        // Verifica se a gaveta específica existe
        const gavetas = gacetasResult.data;
        const gavetaExiste = gavetas.some(g => g.numero === numero_gaveta);

        if (!gavetaExiste) {
            return res.status(404).send('Gaveta não existe neste locker.');
        }

        // Se tudo existir, registra a entrega
        db.run(
            'INSERT INTO entregas(cpf, locker, numero_gaveta, data_entrega) VALUES (?, ?, ?, ?)',
            [cpf, locker, numero_gaveta, data_entrega],
            (err) => {
                if (err) {
                    console.log(err);
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).send('Esta gaveta ou cliente já possui uma entrega. Escolha outra gaveta.');
                    }
                    return res.status(500).send('Erro ao cadastrar entrega.');
                }
                res.status(201).send('Entrega cadastrada com sucesso.');
            }
        );
    } catch (err) {
        console.log(err);
        res.status(500).send('Erro ao verificar disponibilidade da gaveta.');
    }
});

// GET
app.get('/entregas', async (req, res) => {
    db.all('SELECT * FROM entregas', [], (err, rows) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Erro ao buscar entregas.');
        }
        res.status(200).json(rows);
    });
});

app.get('/entregas/:cpf', async (req, res) => {
    const cpf = req.params.cpf;
    if (cpf.length !== 11) {
        return res.status(400).send('CPF deve conter exatamente 11 dígitos.');
     }
    db.get('SELECT * FROM entregas WHERE cpf = ?', [cpf], (err, row) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Erro ao buscar entrega.');
        }
        if (!row) {
            return res.status(404).send('Entrega não encontrada para o CPF fornecido.');
        }
        res.status(200).json(row);
    });
});

// DELETE
app.delete('/entregas/:cpf', async (req, res) => {
    const cpf = req.params.cpf;
    if (cpf.length !== 11) {
        return res.status(400).send('CPF deve conter exatamente 11 dígitos.');
     }

    db.get('SELECT * FROM entregas WHERE cpf = ?', [cpf], (err, row) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Erro ao buscar entrega.');
        }
        if (!row) {
            return res.status(404).send('Entrega não encontrada para o CPF fornecido.');
        }

        (async () => {
            try {
                const aberturaResult = await axios.post(`${ABERTURA_SERVICE}/abertura`, {
                    cpf: cpf,
                    locker: row.locker,
                    numero_gaveta: row.numero_gaveta,
                    data_retirada: new Date().toISOString()
                }, { validateStatus: () => true });

                if (aberturaResult.status !== 200) {
                    return res.status(500).send('Erro ao abrir gaveta.');
                }
            } catch (openErr) {
                console.log(openErr);
                return res.status(500).send('Erro ao abrir gaveta.');
            }

            db.run('DELETE FROM entregas WHERE cpf = ?', [cpf], function(deleteErr) {
                if (deleteErr) {
                    console.log(deleteErr);
                    return res.status(500).send('Erro ao deletar entrega.');
                }
                if (this.changes === 0) {
                    return res.status(404).send('Entrega não encontrada para o CPF fornecido.');
                }
                res.status(200).send('Entrega deletada com sucesso.');
            });
        })();
    });
});