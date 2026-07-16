import type { InventoryMessage } from '@repo/shared';
import type { ConsumeMessage } from 'amqplib';
import { getChannel, EXCHANGES, QUEUES, ROUTING_KEYS } from '../config/rabbitmq';
import { decrementStock, updateOrderStatus } from '../data/store';

export async function processInventory(message: InventoryMessage): Promise<void> {
  const channel = getChannel();

  if (message.simulateScenario === 'api_crash') {
    console.log(`[inventory] API crash simulation — sending order ${message.orderId} to retry queue (5s TTL)`);
    await sendToInventoryRetry({
      orderId: message.orderId,
      productId: message.productId,
      quantity: message.quantity,
      simulateScenario: undefined,
    });
    return;
  }

  const success = decrementStock(message.productId, message.quantity);

  if (!success) {
    const order = updateOrderStatus(message.orderId, 'OUT_OF_STOCK');

    channel.publish(
      EXCHANGES.notification,
      '',
      Buffer.from(
        JSON.stringify({
          orderId: message.orderId,
          status: 'OUT_OF_STOCK',
          message: 'Produto sem estoque suficiente.',
        })
      )
    );

    throw new Error(`Estoque insuficiente para o pedido ${message.orderId}`);
  }

  updateOrderStatus(message.orderId, 'PROCESSING');

  channel.publish(
    EXCHANGES.payment,
    ROUTING_KEYS.payment,
    Buffer.from(
      JSON.stringify({
        orderId: message.orderId,
        idempotencyKey: `${message.orderId}-payment`,
        amount: 0, // será calculado no payment
        simulateScenario: message.simulateScenario,
      })
    )
  );
}

export async function sendToInventoryRetry(message: InventoryMessage): Promise<void> {
  const channel = getChannel();
  channel.sendToQueue(QUEUES.inventoryRetry, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
}

export function consumeInventory(): void {
  const channel = getChannel();
  channel.consume(QUEUES.inventory, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString()) as InventoryMessage;
      await processInventory(content);
      channel.ack(msg);
    } catch (error) {
      console.error('Inventory processing error:', (error as Error).message);
      channel.nack(msg, false, false);
    }
  });
}
