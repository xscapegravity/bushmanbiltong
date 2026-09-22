/**
 * Email abstraction (spec §15).
 * v1 ships a NullMailer — email is deliberately deferred (grill-me decision #5).
 * To enable later: implement Mailer for Resend/SendGrid and flip EMAIL_PROVIDER.
 * Email failure must never break order creation — callers catch and log.
 */

export interface OrderEmailPayload {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  itemsText: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  fulfilmentMethod: string;
  fulfilmentDetails: string;
  customerNotes?: string;
}

export interface Mailer {
  sendOrderConfirmation(to: string, order: OrderEmailPayload): Promise<void>;
  sendOwnerNotification(order: OrderEmailPayload): Promise<void>;
}

class NullMailer implements Mailer {
  async sendOrderConfirmation(): Promise<void> {
    console.log("[email:null] confirmation skipped (EMAIL_PROVIDER=none)");
  }
  async sendOwnerNotification(): Promise<void> {
    console.log("[email:null] owner notification skipped (EMAIL_PROVIDER=none)");
  }
}

class ConsoleMailer implements Mailer {
  async sendOrderConfirmation(
    to: string,
    order: OrderEmailPayload
  ): Promise<void> {
    console.log(`[email:console] would send confirmation to ${to}:`, {
      orderNumber: order.orderNumber,
      total: order.total,
    });
  }
  async sendOwnerNotification(order: OrderEmailPayload): Promise<void> {
    console.log(`[email:console] would notify owner:`, {
      orderNumber: order.orderNumber,
    });
  }
}

export function getMailer(): Mailer {
  switch (process.env.EMAIL_PROVIDER) {
    case "console":
      return new ConsoleMailer();
    default:
      return new NullMailer();
  }
}
