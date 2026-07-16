import { consumeCheckout } from './checkout';
import { consumeInventory } from './inventory';
import { consumePayment, consumePaymentRetry } from './payment';
import { consumeNotifications } from './notification';

export function startConsumers(): void {
  consumeCheckout();
  consumeInventory();
  consumePayment();
  consumePaymentRetry();
  consumeNotifications();
  console.log('All RabbitMQ consumers started');
}
