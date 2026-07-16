export type CheckoutMessage = {
  orderId: string;
  productId: string;
  quantity: number;
  idempotencyKey: string;
  simulateScenario?: 'default' | 'declined' | 'duplicate' | 'concurrent_stock';
};

export type PaymentMessage = {
  orderId: string;
  idempotencyKey: string;
  amount: number;
  simulateScenario?: 'default' | 'declined' | 'duplicate' | 'concurrent_stock';
};

export type InventoryMessage = {
  orderId: string;
  productId: string;
  quantity: number;
  simulateScenario?: 'default' | 'declined' | 'duplicate' | 'concurrent_stock';
};

export type NotificationMessage = {
  orderId: string;
  status: string;
  message: string;
};
