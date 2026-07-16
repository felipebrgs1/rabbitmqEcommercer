export type CheckoutMessage = {
  orderId: string;
  productId: string;
  quantity: number;
  idempotencyKey: string;
  simulateScenario?: 'default' | 'declined' | 'duplicate';
};

export type PaymentMessage = {
  orderId: string;
  idempotencyKey: string;
  amount: number;
  simulateScenario?: 'default' | 'declined' | 'duplicate';
};

export type InventoryMessage = {
  orderId: string;
  productId: string;
  quantity: number;
  simulateScenario?: 'default' | 'declined' | 'duplicate';
};

export type NotificationMessage = {
  orderId: string;
  status: string;
  message: string;
};
