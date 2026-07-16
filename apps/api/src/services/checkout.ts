import type { CheckoutMessage, CreateOrderRequest } from '@repo/shared';
import type { ConsumeMessage } from 'amqplib';
import { getChannel, EXCHANGES, QUEUES, ROUTING_KEYS } from '../config/rabbitmq';
import {
  createOrder,
  getProductById,
  hasIdempotencyKey,
  getIdempotencyResult,
  setIdempotencyResult,
} from '../data/store';

export async function processCheckoutRequest(
  payload: CreateOrderRequest
): Promise<{ success: boolean; order?: ReturnType<typeof createOrder>; message: string; isDuplicate?: boolean }> {
  // Cenário 1: Idempotência na entrada - duplo clique no botão comprar
  if (hasIdempotencyKey(payload.idempotencyKey)) {
    const cached = getIdempotencyResult<ReturnType<typeof createOrder>>(payload.idempotencyKey);
    return {
      success: true,
      order: cached || undefined,
      message: 'Pedido idempotente: mesmo resultado da requisição anterior.',
      isDuplicate: true,
    };
  }

  const product = getProductById(payload.productId);
  if (!product) {
    return { success: false, message: 'Produto não encontrado.' };
  }

  const order = createOrder(payload.productId, payload.quantity, payload.idempotencyKey);
  setIdempotencyResult(payload.idempotencyKey, order);

  const message: CheckoutMessage = {
    orderId: order.id,
    productId: order.productId,
    quantity: order.quantity,
    idempotencyKey: order.idempotencyKey,
    simulateScenario: payload.simulateScenario,
  };

  const channel = getChannel();
  channel.publish(EXCHANGES.checkout, ROUTING_KEYS.checkout, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });

  return {
    success: true,
    order,
    message: 'Pedido enviado para processamento assíncrono.',
  };
}

export function consumeCheckout(): void {
  const channel = getChannel();
  channel.consume(QUEUES.checkout, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString()) as CheckoutMessage;
      const channel = getChannel();

      // Validação de estoque antes de enviar para inventory
      channel.publish(
        EXCHANGES.inventory,
        ROUTING_KEYS.inventory,
        Buffer.from(
          JSON.stringify({
            orderId: content.orderId,
            productId: content.productId,
            quantity: content.quantity,
            simulateScenario: content.simulateScenario,
          })
        )
      );

      channel.ack(msg);
    } catch (error) {
      console.error('Checkout processing error:', (error as Error).message);
      channel.nack(msg, false, false);
    }
  });
}
