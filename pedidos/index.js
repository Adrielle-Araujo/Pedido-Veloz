const express = require('express');
const amqp = require('amqplib');
const crypto = require('crypto');
const client = require('prom-client');

const app = express();
app.use(express.json());

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
const EXCHANGE = 'pedidoEvents';

// Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const eventsPublished = new client.Counter({ name: 'pedidos_events_published_total', help: 'Pedidos events published' });
register.registerMetric(eventsPublished);

let channel;

async function connectRabbit() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    console.log('Conectado ao RabbitMQ em', RABBITMQ_URL);

    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err && err.message);
    });

    connection.on('close', () => {
      console.warn('RabbitMQ connection closed, tentando reconectar...');
      channel = null;
      setTimeout(connectRabbit, 5000);
    });

    process.on('exit', async () => {
      if (channel) await channel.close();
      await connection.close();
    });

    process.on('SIGINT', async () => {
      if (channel) await channel.close();
      await connection.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('Falha ao conectar RabbitMQ:', err.message);
    setTimeout(connectRabbit, 5000);
  }
}

connectRabbit();

app.get('/', (req, res) => {
  res.send('Serviço de Pedidos funcionando!');
});

app.post('/pedidos', async (req, res) => {
  const pedido = req.body;
  if (!pedido || !pedido.cliente || !pedido.itens) {
    return res.status(400).json({ error: 'Pedido inválido: cliente e itens são obrigatórios' });
  }

  if (!channel) {
    return res.status(503).json({ error: 'Mensageria indisponível. Aguarde o RabbitMQ iniciar.' });
  }

  const data = {
    id: crypto.randomUUID(),
    cliente: pedido.cliente,
    itens: pedido.itens,
    total: pedido.total || 0,
    criadoEm: new Date().toISOString(),
  };

  const event = {
    tipo: 'PedidoCriado',
    data,
  };

  channel.publish(EXCHANGE, 'pedido.criado', Buffer.from(JSON.stringify(event)), { persistent: true });
  console.log('Evento publicado:', event.tipo, data.id);
  eventsPublished.inc();

  res.status(201).json(data);
});

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.listen(3001, () => {
  console.log('Pedidos rodando na porta 3001');
});
