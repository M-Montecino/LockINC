const express = require('express');
const app = express();

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Inicia o Servidor na porta 8110
let porta = 8110;
app.listen(porta, () => {
 console.log('Servidor em execução na porta: ' + porta);
});

// Importa o package do SQLite
const sqlite3 = require('sqlite3');

// Acessa o arquivo com o banco de dados
var db = new sqlite3.Database('./dados.db', (err) => {
        if (err) {
            console.log('ERRO: não foi possível conectar ao SQLite.');
            throw err;
        }
        console.log('Conectado ao SQLite!');
    });

//DB
db.run(`CREATE TABLE IF NOT EXISTS lockers
        ( endereco TEXT NOT NULL,
          codigo INTEGER PRIMARY KEY NOT NULL UNIQUE)`, 
        [], (err) => {
           if (err) {
              console.log('ERRO: não foi possível criar tabela.');
              throw err;
           }
      });

db.run(`CREATE TABLE IF NOT EXISTS gavetas(
            locker INTEGER,
            tamanho TEXT NOT NULL CHECK(tamanho IN ('P', 'M', 'G', 'GG')),
            numero INTEGER PRIMARY KEY AUTOINCREMENT,
            ocupado BOOLEAN NOT NULL DEFAULT 0,
            FOREIGN KEY(locker) REFERENCES lockers(codigo)
        )`,
    [], (err) => {
       if (err) {
          console.log('ERRO: não foi possível criar tabela.');
          throw err;
       }
  });

// Método HTTP POST /Locker- cadastra um novo locker
app.post('/lockers', (req, res, next) => {
    db.run(`INSERT INTO lockers(endereco, codigo) VALUES(?,?)`, 
         [req.body.endereco, req.body.codigo], (err) => {
        if (err) {
            console.log("Error: " + err);
            res.status(500).send('Erro ao cadastrar locker.');
        } else {
            console.log('Locker cadastrado com sucesso!');
            res.status(200).send('Locker cadastrado com sucesso!');
        }
    });

    db.run(`INSERT INTO gavetas(locker, tamanho) VALUES(?,?)`,
         [req.body.codigo, 'P'], (err) => {
        if (err) {
            console.log("Error: " + err);
            res.status(500).send('Erro ao cadastrar gaveta.');
        } else {
            console.log('Gaveta cadastrada com sucesso!');
            res.status(200).send('Gaveta cadastrada com sucesso!');
        }
    }); 
});

// {
//     "codigo_locker": 123,
//     "endereco": "Rua das Flores, 123",
//     "gavetas": {
//         "P": 10,
//         "M": 5,
//         "G": 2,
//         "GG": 1
//     }
// }