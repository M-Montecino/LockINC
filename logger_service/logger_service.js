const express = require('express');
const app = express();
const sqlite3 = require('sqlite3');

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

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
db.run(`CREATE TABLE IF NOT EXISTS logger
        (cpf numeric[11] PRIMARY KEY NOT NULL UNIQUE,
        locker INTEGER NOT NULL,
        numero_gaveta INTEGER NOT NULL,
        data_retirada DATETIME NOT NULL)`, 
    [], (err) => {
        if (err) {
            console.log('ERRO: não foi possível criar tabela.');
              throw err;
        }
});

// POST
app.post('/logger', async (req, res) => {
    const { cpf, locker, numero_gaveta, data_retirada } = req.body;

    if (!cpf || !locker || !numero_gaveta || !data_retirada) {
        return res.status(400).send('Dados incompletos. Por favor, forneça CPF, locker, número da gaveta e data de entrega.');
    }
    if (cpf.length !== 11) {
        return res.status(400).send('CPF deve conter exatamente 11 dígitos.');
     }
    
    db.run(
        'INSERT INTO logger(cpf, locker, numero_gaveta, data_retirada) VALUES (?, ?, ?, ?)',
        [cpf, locker, numero_gaveta, data_retirada],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Erro ao cadastrar entrega.');
            }
            res.status(201).send('Entrega cadastrada com sucesso.');
        }
    );
});

// GET
app.get('/logger', async (req, res) => {
    db.all('SELECT * FROM logger', [], (err, rows) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Erro ao buscar logger.');
        }
        res.status(200).json(rows);
    });
});

app.get('/logger/:cpf', async (req, res) => {
    const cpf = req.params.cpf;
    if (cpf.length !== 11) {
        return res.status(400).send('CPF deve conter exatamente 11 dígitos.');
     }
    db.get('SELECT * FROM logger WHERE cpf = ?', [cpf], (err, row) => {
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
app.delete('/logger/:cpf', async (req, res) => {
    const cpf = req.params.cpf;
    if (cpf.length !== 11) {
        return res.status(400).send('CPF deve conter exatamente 11 dígitos.');
     }
    db.run('DELETE FROM logger WHERE cpf = ?', [cpf], function(err) {
        if (err) {
            console.log(err);
            return res.status(500).send('Erro ao deletar entrega.');
        }
        if (this.changes === 0) {
            return res.status(404).send('Entrega não encontrada para o CPF fornecido.');
        }
        res.status(200).send('Entrega deletada com sucesso.');
    });
});

// {
//     "cpf": "12345678901",
//     "locker": 123,
//     "numero_gaveta": 1,
//     "data_retirada": "2024-06-01T10:00:00Z"
// }