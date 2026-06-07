const express = require('express');
const app = express();
const axios = require('axios');

// Body Parser - usado para processar dados da requisição HTTP
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Inicia o Servidor na porta 8100
let porta = 8100;
app.listen(porta, () => {
 console.log('Servidor em execução na porta: ' + porta);
});

//URLs
const LOCKER_SERVICE = 'http://localhost:8110';
const CONDOMINO_SERVICE = 'http://localhost:8080';
const ENTREGA_SERVICE = 'http://localhost:8090';
const LOGGER_SERVICE = 'http://localhost:8000';

// registra uma entrega no locker
app.post('/entregador/entregar', async (req, res) => {
    const { cpf, locker, numero_gaveta, data_entrega } = req.body;

    if (!cpf || !locker || !numero_gaveta || !data_entrega) {
        return res.status(400).send('Dados incompletos: CPF, locker, número da gaveta e data de entrega são obrigatórios.');
    }

    try {
        const result = await axios.post(`${ENTREGA_SERVICE}/entregas`, 
            { cpf, locker, numero_gaveta, data_entrega },
            { validateStatus: () => true }
        );
        res.status(result.status).send(result.data);
    } catch (err) {
        console.log(err);
        res.status(500).send('Erro ao registrar entrega.');
    }
});

// condomino ve suas entregas
app.get('/condomino/:cpf/entregas', async (req, res) => {
    const cpf = req.params.cpf;
    
    if (cpf.length !== 11) {
        return res.status(400).send('CPF deve conter exatamente 11 dígitos.');
    }

    try {
        const result = await axios.get(`${ENTREGA_SERVICE}/entregas/${cpf}`,
            { validateStatus: () => true }
        );
        if (result.status === 404) {
            return res.status(404).send('Nenhuma entrega encontrada para este CPF.');
        }
        res.status(result.status).json(result.data);
    } catch (err) {
        console.log(err);
        res.status(500).send('Erro ao buscar entregas.');
    }
});

// retorna gavetas ocupadas por um condomino
app.get('/condomino/:cpf/gavetas', async (req, res) => {
    const cpf = req.params.cpf;

    try {
        // busca o condomino para verificar se existe
        const condominoResult = await axios.get(`${CONDOMINO_SERVICE}/condominos/${cpf}`,
            { validateStatus: () => true }
        );
        if (condominoResult.status === 404) {
            return res.status(404).send('Condômino não encontrado.');
        }

        // busca entregas do condomino
        const entregasResult = await axios.get(`${ENTREGA_SERVICE}/entregas/${cpf}`,
            { validateStatus: () => true }
        );
        if (entregasResult.status === 404) {
            return res.status(200).json([]);
        }

        const entrega = entregasResult.data;
        // busca lockers e gavetas para cada entrega
        const gavetasResult = await axios.get(`${LOCKER_SERVICE}/lockers/${entrega.locker}/gavetas`,
            { validateStatus: () => true }
        );
        
        res.status(200).json({
            cpf: cpf,
            locker: entrega.locker,
            numero_gaveta: entrega.numero_gaveta,
            data_entrega: entrega.data_entrega
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('Erro ao buscar gavetas.');
    }
});

// condômino recolhe entrega
app.delete('/condomino/:cpf/recolher', async (req, res) => {
    const cpf = req.params.cpf;

    if (cpf.length !== 11) {
        return res.status(400).send('CPF deve conter exatamente 11 dígitos.');
    }

    try {
        // busca entrega para verificar se existe
        const entregaResult = await axios.get(`${ENTREGA_SERVICE}/entregas/${cpf}`,
            { validateStatus: () => true }
        );
        
        if (entregaResult.status === 404) {
            return res.status(404).send('Entrega não encontrada.');
        }

        const entrega = entregaResult.data;

        // registra no logger
        const logResult = await axios.post(`${LOGGER_SERVICE}/logger`, {
            cpf: cpf,
            locker: entrega.locker,
            numero_gaveta: entrega.numero_gaveta,
            data_retirada: new Date().toISOString()
        },
            { validateStatus: () => true }
        );

        if (logResult.status !== 201 && logResult.status !== 200) {
            return res.status(500).send('Erro ao registrar no histórico.');
        }

        // deleta de entregas
        const deleteResult = await axios.delete(`${ENTREGA_SERVICE}/entregas/${cpf}`,
            { validateStatus: () => true }
        );
        
        res.status(deleteResult.status).send('Entrega recolhida com sucesso e registrada no histórico.');
    } catch (err) {
        console.log(err);
        res.status(500).send('Erro ao recolher entrega.');
    }
});

// admin cadastra locker
app.post('/admin/lockers', async (req, res) => {
    const { codigo, cep, numero_cep, complemento, gavetas } = req.body;

    if (!codigo || !cep || !numero_cep || !gavetas) {
        return res.status(400).send('Dados incompletos para cadastro de locker.');
    }

    try {
        const result = await axios.post(`${LOCKER_SERVICE}/lockers`,
            { codigo, cep, numero_cep, complemento, gavetas },
            { validateStatus: () => true }
        );
        res.status(result.status).send(result.data);
    } catch (err) {
        console.log(err);
        res.status(500).send('Erro ao cadastrar locker.');
    }
});

// lista lockers
app.get('/admin/lockers', async (req, res) => {
    try {
        const result = await axios.get(`${LOCKER_SERVICE}/lockers`,
            { validateStatus: () => true }
        );
        res.status(result.status).json(result.data);
    } catch (err) {
        console.log(err);
        res.status(500).send('Erro ao buscar lockers.');
    }
});

// admin cadastra novo condômino
app.post('/admin/condominos', async (req, res) => {
    const { cpf, nome, telefone, cep, numero_cep, complemento } = req.body;

    if (!cpf || !nome || !telefone || !cep || !numero_cep) {
        return res.status(400).send('Dados incompletos para cadastro de condômino.');
    }

    try {
        const result = await axios.post(`${CONDOMINO_SERVICE}/condominos`,
            { cpf, nome, telefone, cep, numero_cep, complemento },
            { validateStatus: () => true }
        );
        res.status(result.status).send(result.data);
    } catch (err) {
        console.log(err);
        res.status(500).send('Erro ao cadastrar condômino.');
    }
});

// lista condôminos
app.get('/admin/condominos', async (req, res) => {
    try {
        const result = await axios.get(`${CONDOMINO_SERVICE}/condominos`,
            { validateStatus: () => true }
        );
        res.status(result.status).json(result.data);
    } catch (err) {
        console.log(err);
        res.status(500).send('Erro ao buscar condôminos.');
    }
});

//admin ve histórico de entregas
app.get('/admin/logs', async (req, res) => {
    try {
        const result = await axios.get(`${LOGGER_SERVICE}/logger`,
            { validateStatus: () => true }
        );
        res.status(result.status).json(result.data || []);
    } catch (err) {
        console.log(err);
        res.status(500).send('Erro ao buscar histórico de entregas.');
    }
});

// admin ve historico de entregas por cpf
app.get('/admin/logs/:cpf', async (req, res) => {
    const cpf = req.params.cpf;

    try {
        const result = await axios.get(`${LOGGER_SERVICE}/logger/${cpf}`,
            { validateStatus: () => true }
        );
        res.status(result.status).json(result.data);
    } catch (err) {
        console.log(err);
        res.status(500).send('Erro ao buscar histórico.');
    }
});