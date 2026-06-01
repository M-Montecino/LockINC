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
        db.run('PRAGMA foreign_keys = ON');
        console.log('Conectado ao SQLite!');
    });

const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
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
app.post('/lockers', async (req, res) => {
    if (!req.body.endereco || !req.body.codigo || !req.body.gavetas) {
        return res.status(400).send('Dados incompletos. Por favor, forneça endereço, código e gavetas.');
    }
    if (req.body.gavetas.P < 0 || req.body.gavetas.M < 0 || req.body.gavetas.G < 0 || req.body.gavetas.GG < 0) {
        return res.status(400).send('Número de gavetas não pode ser negativo.');
    }
    if (req.body.gavetas.P + req.body.gavetas.M + req.body.gavetas.G + req.body.gavetas.GG === 0) {
        return res.status(400).send('O locker deve ter pelo menos uma gaveta.');
    }
    try {
    await runAsync(
        `INSERT INTO lockers(endereco, codigo) VALUES(?,?)`,
        [req.body.endereco, req.body.codigo]
    );

    const tarefas = [];


    for (let i = 0; i < req.body.gavetas.P; i++) {
        tarefas.push(runAsync(`INSERT INTO gavetas(locker, tamanho) VALUES(?,?)`, [req.body.codigo, 'P']));
    }

    for (let i = 0; i < req.body.gavetas.M; i++) {
        tarefas.push(runAsync(`INSERT INTO gavetas(locker, tamanho) VALUES(?,?)`, [req.body.codigo, 'M']));
    }

    for (let i = 0; i < req.body.gavetas.G; i++) {
        tarefas.push(runAsync(`INSERT INTO gavetas(locker, tamanho) VALUES(?,?)`, [req.body.codigo, 'G']));
    }

    for (let i = 0; i < req.body.gavetas.GG; i++) {
        tarefas.push(runAsync(`INSERT INTO gavetas(locker, tamanho) VALUES(?,?)`, [req.body.codigo, 'GG']));
    }

    await Promise.all(tarefas);

    return res.status(201).send('Locker cadastrado com sucesso.');
    } catch (err) {
    console.log('Error:', err);
    return res.status(500).send('Erro ao cadastrar locker.');
    }
});

app.get('/lockers', (req, res) => {
    db.all(`SELECT * FROM lockers`, [], (err, rows) => {
        if (err) {
            console.log('Error:', err);
            return res.status(500).send('Erro ao buscar lockers.');
        }
        return res.status(200).json(rows);
    });
});

app.get('/lockers/:codigo', (req, res) => {
    const codigo = req.params.codigo;
    db.get(`SELECT * FROM lockers WHERE codigo = ?`, [codigo], (err, locker) => {
        if (err) {
            console.log('Error:', err);
            return res.status(500).send('Erro ao buscar locker.');
        }
        if (!locker) {
            return res.status(404).send('Locker não encontrado.');
        }
        return res.status(200).json(locker);
    });
});

app.get('/lockers/:codigo/gavetas', (req, res) => {
    const codigo = req.params.codigo;
    db.all(`SELECT * FROM gavetas WHERE locker = ?`, [codigo], (err, gavetas) => {
        if (err) {
            console.log('Error:', err);
            return res.status(500).send('Erro ao buscar gavetas.');
        }
        return res.status(200).json(gavetas);
    });
});

app.delete('/lockers/:codigo', (req, res) => {
    const codigo = req.params.codigo;
    db.run(`DELETE FROM gavetas WHERE locker = ?`, [codigo], function(err) {
        if (err) {
            console.log('Error:', err);
            return res.status(500).send('Erro ao deletar gavetas do locker.');
        }
        db.run(`DELETE FROM lockers WHERE codigo = ?`, [codigo], function(err) {
            if (err) {
                console.log('Error:', err);
                return res.status(500).send('Erro ao deletar locker.');
            }
            if (this.changes === 0) {
                return res.status(404).send('Locker não encontrado.');
            }
            return res.status(200).send('Locker deletado com sucesso.');
        });
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