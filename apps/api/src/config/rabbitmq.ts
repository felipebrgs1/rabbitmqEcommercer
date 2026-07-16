import amqp from 'amqplib';
import type { Channel, ChannelModel } from 'amqplib';

export const EXCHANGES = {
  checkout: 'checkout.exchange',
  payment: 'payment.exchange',
  inventory: 'inventory.exchange',
  notification: 'notification.exchange',
  deadLetter: 'dead-letter.exchange',
};

export const QUEUES = {
  checkout: 'checkout.queue',
  payment: 'payment.queue',
  inventory: 'inventory.queue',
  notification: 'notification.queue',
  deadLetter: 'dead-letter.queue',
  paymentRetry: 'payment.retry.queue',
  inventoryRetry: 'inventory.retry.queue',
};

export const ROUTING_KEYS = {
  checkout: 'checkout.created',
  payment: 'payment.process',
  inventory: 'inventory.reserve',
  notification: 'notification.send',
  deadLetter: 'dead-letter',
};

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

export async function connectRabbitMQ(): Promise<Channel> {
  if (channel) return channel;

  connection = await amqp.connect(RABBITMQ_URL);
  const newChannel = await connection.createChannel();
  channel = newChannel;

  // Dead letter exchange
  await newChannel.assertExchange(EXCHANGES.deadLetter, 'direct', { durable: true });
  await newChannel.assertQueue(QUEUES.deadLetter, { durable: true });
  await newChannel.bindQueue(QUEUES.deadLetter, EXCHANGES.deadLetter, ROUTING_KEYS.deadLetter);

  // Main exchanges
  await newChannel.assertExchange(EXCHANGES.checkout, 'direct', { durable: true });
  await newChannel.assertExchange(EXCHANGES.payment, 'direct', { durable: true });
  await newChannel.assertExchange(EXCHANGES.inventory, 'direct', { durable: true });
  await newChannel.assertExchange(EXCHANGES.notification, 'fanout', { durable: true });

  // Main queues with DLX
  await newChannel.assertQueue(QUEUES.checkout, {
    durable: true,
    arguments: { 'x-dead-letter-exchange': EXCHANGES.deadLetter },
  });
  await newChannel.assertQueue(QUEUES.payment, {
    durable: true,
    arguments: { 'x-dead-letter-exchange': EXCHANGES.deadLetter },
  });
  await newChannel.assertQueue(QUEUES.inventory, {
    durable: true,
    arguments: { 'x-dead-letter-exchange': EXCHANGES.deadLetter },
  });
  await newChannel.assertQueue(QUEUES.notification, { durable: true });

  // Retry queues with TTL
  await newChannel.assertQueue(QUEUES.paymentRetry, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': EXCHANGES.payment,
      'x-dead-letter-routing-key': ROUTING_KEYS.payment,
      'x-message-ttl': 10000,
    },
  });
  await newChannel.assertQueue(QUEUES.inventoryRetry, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': EXCHANGES.inventory,
      'x-dead-letter-routing-key': ROUTING_KEYS.inventory,
      'x-message-ttl': 5000,
    },
  });

  // Bindings
  await newChannel.bindQueue(QUEUES.checkout, EXCHANGES.checkout, ROUTING_KEYS.checkout);
  await newChannel.bindQueue(QUEUES.payment, EXCHANGES.payment, ROUTING_KEYS.payment);
  await newChannel.bindQueue(QUEUES.inventory, EXCHANGES.inventory, ROUTING_KEYS.inventory);
  await newChannel.bindQueue(QUEUES.notification, EXCHANGES.notification, '');

  console.log('RabbitMQ connected and topology configured');
  return newChannel;
}

export function getChannel(): Channel {
  if (!channel) throw new Error('RabbitMQ channel not initialized');
  return channel;
}

export async function closeRabbitMQ(): Promise<void> {
  await channel?.close();
  await connection?.close();
}
