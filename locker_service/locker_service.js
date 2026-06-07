const express = require('express');
const app = express();
const sqlite3 = require('sqlite3');

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Inicia o Servidor na porta 8110
let porta = 8110;
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
db.run(`CREATE TABLE IF NOT EXISTS lockers
        (codigo INTEGER PRIMARY KEY NOT NULL UNIQUE,
        cep numeric[8] NOT NULL,
        numero_cep integer NOT NULL,
        complemento TEXT)`, 
        [], (err) => {
           if (err) {
              console.log('ERRO: não foi possível criar tabela.');
              throw err;
           }
      });

db.run(`CREATE TABLE IF NOT EXISTS gavetas(
            locker INTEGER NOT NULL,
            numero INTEGER NOT NULL,
            tamanho TEXT NOT NULL CHECK(tamanho IN ('P', 'M', 'G', 'GG')),
            PRIMARY KEY(locker, numero),
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
    const { codigo, cep, numero_cep, complemento, gavetas } = req.body;

    if (!cep || !numero_cep || !codigo || !gavetas) {
        return res.status(400).send('Dados incompletos. Por favor, forneça CEP, número do CEP, código e gavetas.');
    }
    if (gavetas.P < 0 || gavetas.M < 0 || gavetas.G < 0 || gavetas.GG < 0) {
        return res.status(400).send('Número de gavetas não pode ser negativo.');
    }
    if (gavetas.P + gavetas.M + gavetas.G + gavetas.GG === 0) {
        return res.status(400).send('O locker deve ter pelo menos uma gaveta.');
    }

    db.run(
        'INSERT INTO lockers(cep, numero_cep, complemento, codigo) VALUES (?, ?, ?, ?)',
        [cep, numero_cep, complemento, codigo],
        (err) => {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return res.status(400).send('O código do locker deve ser único.');
                }
                console.log(err);
                return res.status(500).send('Erro ao cadastrar locker.');
            }
            let gavetaNumero = 1;
            for (let i = 0; i < gavetas.P; i++) {
                db.run(
                    'INSERT INTO gavetas(locker, tamanho, numero) VALUES (?, ?, ?)',
                    [codigo, 'P', gavetaNumero++] 
                );
            }

            for (let i = 0; i < gavetas.M; i++) {
                db.run(
                    'INSERT INTO gavetas(locker, tamanho, numero) VALUES (?, ?, ?)',
                    [codigo, 'M', gavetaNumero++] 
                );
            }

            for (let i = 0; i < gavetas.G; i++) {
                db.run(
                    'INSERT INTO gavetas(locker, tamanho, numero) VALUES (?, ?, ?)',
                    [codigo, 'G', gavetaNumero++] 
                );
            }

            for (let i = 0; i < gavetas.GG; i++) {
                db.run(
                    'INSERT INTO gavetas(locker, tamanho, numero) VALUES (?, ?, ?)',
                    [codigo, 'GG', gavetaNumero++] 
                );
            }

            res.status(201).send('Locker cadastrado com sucesso.');
        }
    );
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
//      "codigo": 123,
//      "cep": 88040480,
//      "numero_cep": 12345,
//      "complemento": "APTO 203",
//      "gavetas": {
//          "P": 10,
//          "M": 5,
//          "G": 2,
//          "GG": 1
//     }
// }