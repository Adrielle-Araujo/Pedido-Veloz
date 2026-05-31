const express = require('express');
const amqp = require('amqplib');
const client = require('prom-client');

const app = express();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
const EXCHANGE = 'pedidoEvents';
const QUEUE = 'pagamentos.pedidos';
const ROUTING_KEY = 'pedido.criado';

// Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const eventsConsumed = new client.Counter({ name: 'pagamentos_events_consumed_total', help: 'Pagamentos events consumed' });
register.registerMetric(eventsConsumed);

let channel;
let connection;

async function connectRabbit() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

    await channel.consume(QUEUE, (msg) => {
      if (!msg) return;
      const event = JSON.parse(msg.content.toString());
      console.log('Evento recebido em pagamentos:', event.tipo, event.data.id);
      console.log('  Cliente:', event.data.cliente);
      console.log('  Total:', event.data.total);
      eventsConsumed.inc();
      channel.ack(msg);
    });

    console.log('Consumidor de pedidos iniciado em pagamentos.');

    connection.on('error', (err) => {
      console.error('RabbitMQ connection error (pagamentos):', err && err.message);
    });

    connection.on('close', () => {
      console.warn('RabbitMQ connection closed (pagamentos), tentando reconectar...');
      channel = null;
      setTimeout(connectRabbit, 5000);
    });

    process.on('exit', async () => {
      if (channel) await channel.close();
      if (connection) await connection.close();
    });
  } catch (err) {
    console.error('Falha ao conectar RabbitMQ em pagamentos:', err.message);
    setTimeout(connectRabbit, 5000);
  }
}

connectRabbit();

app.get('/', (req, res) => {
  res.send('Serviço de Pagamentos funcionando!');
});

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.listen(3002, () => {
  console.log('Pagamentos rodando na porta 3002');
});
