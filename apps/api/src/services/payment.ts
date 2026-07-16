import type { PaymentMessage } from '@repo/shared';
import type { ConsumeMessage } from 'amqplib';
import { getChannel, EXCHANGES, QUEUES, ROUTING_KEYS } from '../config/rabbitmq';
import {
  getOrderById,
  getProductById,
  getPaymentResult,
  setPaymentResult,
  hasIdempotencyKey,
  getIdempotencyResult,
  setIdempotencyResult,
  updateOrderStatus,
} from '../data/store';

export async function processPayment(message: PaymentMessage): Promise<void> {
  const channel = getChannel();
  const order = getOrderById(message.orderId);

  if (!order) {
    throw new Error(`Pedido ${message.orderId} não encontrado`);
  }

  // Cenário 1: Idempotência - duplo clique
  if (hasIdempotencyKey(message.idempotencyKey)) {
    const cached = getPaymentResult(message.orderId);
    console.log(`Pagamento idempotente detectado: ${message.orderId}`);
    channel.publish(
      EXCHANGES.notification,
      '',
      Buffer.from(
        JSON.stringify({
          orderId: message.orderId,
          status: 'IDEMPOTENT_PAYMENT',
          message: 'Pagamento já processado (idempotência).',
        })
      )
    );
    return;
  }

  const product = getProductById(order.productId);
  const amount = product ? product.price * order.quantity : 0;

  // Cenário 2: Pagamento recusado
  const isDeclined = message.simulateScenario === 'declined';
  if (isDeclined) {
    updateOrderStatus(message.orderId, 'PAYMENT_DECLINED', 'DECLINED');
    setPaymentResult(message.orderId, { status: 'DECLINED', reason: 'Cartão recusado' });
    setIdempotencyResult(message.idempotencyKey, { orderId: message.orderId, status: 'DECLINED' });

    channel.publish(
      EXCHANGES.notification,
      '',
      Buffer.from(
        JSON.stringify({
          orderId: message.orderId,
          status: 'PAYMENT_DECLINED',
          message: 'Pagamento recusado pelo gateway.',
        })
      )
    );

    throw new Error(`Pagamento recusado para o pedido ${message.orderId}`);
  }

  // Sucesso no pagamento
  updateOrderStatus(message.orderId, 'PAYMENT_APPROVED', 'APPROVED');
  setPaymentResult(message.orderId, { status: 'APPROVED', amount });
  setIdempotencyResult(message.idempotencyKey, { orderId: message.orderId, status: 'APPROVED' });

  updateOrderStatus(message.orderId, 'COMPLETED', 'APPROVED');

  channel.publish(
    EXCHANGES.notification,
    '',
    Buffer.from(
      JSON.stringify({
        orderId: message.orderId,
        status: 'COMPLETED',
        message: `Pagamento de R$ ${amount.toFixed(2)} aprovado!`,
      })
    )
  );
}

export async function sendToPaymentRetry(message: PaymentMessage): Promise<void> {
  const channel = getChannel();
  channel.sendToQueue(QUEUES.paymentRetry, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
}

export function consumePayment(): void {
  const channel = getChannel();
  channel.consume(QUEUES.payment, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString()) as PaymentMessage;
      await processPayment(content);
      channel.ack(msg);
    } catch (error) {
      console.error('Payment processing error:', (error as Error).message);
      channel.nack(msg, false, false);
    }
  });
}

export function consumePaymentRetry(): void {
  const channel = getChannel();
  channel.consume(QUEUES.paymentRetry, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString()) as PaymentMessage;
      await processPayment({ ...content, simulateScenario: 'default' });
      channel.ack(msg);
    } catch (error) {
      console.error('Payment retry failed:', (error as Error).message);
      channel.nack(msg, false, false);
    }
  });
}
