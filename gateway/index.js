const express = require('express');
const client = require('prom-client');

const app = express();

// Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

app.get('/', (req, res) => {
    res.send('Gateway funcionando!');
});

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});