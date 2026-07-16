import type { NotificationMessage } from '@repo/shared';
import type { ConsumeMessage } from 'amqplib';
import { getChannel, QUEUES } from '../config/rabbitmq';

export function consumeNotifications(): void {
  const channel = getChannel();
  channel.consume(QUEUES.notification, (msg: ConsumeMessage | null) => {
    if (!msg) return;

    const content = JSON.parse(msg.content.toString()) as NotificationMessage;
    console.log(`[NOTIFICAÇÃO] Pedido ${content.orderId}: ${content.message}`);

    // Aqui poderia enviar e-mail, SMS, push, etc.
    channel.ack(msg);
  });
}
