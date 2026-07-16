import express from 'express';
import cors from 'cors';
import { connectRabbitMQ, closeRabbitMQ } from './config/rabbitmq';
import routes from './routes';
import { startConsumers } from './services/consumers';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function bootstrap() {
  try {
    await connectRabbitMQ();
    startConsumers();

    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await closeRabbitMQ();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeRabbitMQ();
  process.exit(0);
});

bootstrap();
