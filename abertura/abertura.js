const express = require('express');
const app = express();

app.use(express.json());

app.post('/abertura', (req, res) => {
  console.log('entra x realizada');
  res.status(200).send('OK');
});

const porta = 8120;
app.listen(porta, () => {
  console.log(`Abertura service rodando na porta ${porta}`);
});
