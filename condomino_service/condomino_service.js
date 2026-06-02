const express = require('express');
const app = express();
const sqlite3 = require('sqlite3');

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Inicia o Servidor na porta 8080
let porta = 8080;
app.listen(porta, () => {
 console.log('Servidor em execução na porta: ' + porta);
});

//Acesso o arquiivo de db
var db = new sqlite3.Database('./dados.db', (err) => {
        if (err) {
            console.log('ERRO: não foi possível conectar ao SQLite.');
            throw err;
        }
        db.run('PRAGMA foreign_keys = ON');
        console.log('Conectado ao SQLite!');
});

//DB
db.run(`CREATE TABLE IF NOT EXISTS condominos
        (cpf numeric[11] PRIMARY KEY NOT NULL UNIQUE,
        nome TEXT NOT NULL,
        telefone numeric[11] NOT NULL,
        cep numeric[8] NOT NULL,
        numero_cep integer NOT NULL,
        complemento TEXT)`, 
        [], (err) => {
           if (err) {
              console.log('ERRO: não foi possível criar tabela.');
              throw err;
           }
      });

//metodo HTTP POST /condominos - cadastra um novo condômino
app.post('/condominos', async (req, res) => {
    const { cpf, nome, telefone, cep, numero_cep, complemento } = req.body;

    if (!cpf || !nome || !telefone || !cep || !numero_cep) {
        return res.status(400).send('Dados incompletos. Por favor, forneça CPF, nome, telefone, CEP e número do CEP.');
    }
    if (cpf.length !== 11 || telefone.length !== 11) {
        return res.status(400).send('CPF e telefone devem conter exatamente 11 dígitos.');
    }

    db.run(
        'INSERT INTO condominos(cpf, nome, telefone, cep, numero_cep, complemento) VALUES (?, ?, ?, ?, ?, ?)',
        [cpf, nome, telefone, cep, numero_cep, complemento],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Erro ao cadastrar condômino.');
            }
            res.status(201).send('Condômino cadastrado com sucesso.');
        }
    );
});

//GETS
app.get('/condominos', async (req, res) => {
    db.all('SELECT * FROM condominos', [], (err, rows) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Erro ao buscar condominos.');
        }
        res.status(200).json(rows);
    });
})

app.get('/condominos/:cpf', async (req, res) => {
    const cpf = req.params.cpf;
    db.get('SELECT * FROM condominos WHERE cpf = ?', [cpf], (err, row) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Erro ao buscar condômino.');
        }
        if (!row) {
            return res.status(404).send('Condômino não encontrado.');
        }
        res.status(200).json(row);
    });
});

//DELETE
app.delete('/condominos/:cpf', async (req, res) => {
    const cpf = req.params.cpf;
    db.run('DELETE FROM condominos WHERE cpf = ?', [cpf], function(err) {
        if (err) {
            console.log(err);
            return res.status(500).send('Erro ao deletar condômino.');
        }
        if (this.changes === 0) {
            return res.status(404).send('Condômino não encontrado.');
        }
        res.status(200).send('Condômino deletado com sucesso.');
    });
});

// {
//     cpf: "12345678901",
//     nome: "Vitor da Silva",
//     telefone: "11223344556",
//     cep: "12345678",
//     numero_cep: 123,
//     complemento: "Apartamento 101"
// }