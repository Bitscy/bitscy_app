import { z } from 'zod';

const SatsString = z.string().regex(/^\d+$/, 'Must be a positive integer string');

export const createOrderSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().positive().max(100).default(1),
  encryptedShipping: z.string().optional(),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

export const shipOrderSchema = z.object({
  shippingNote: z.string().max(500).optional(),
});

export const payoutSchema = z.object({
  amountSats: SatsString,
  bankAccountId: z.string().cuid(),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export type CreateOrderData = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type ShipOrderData = z.infer<typeof shipOrderSchema>;
export type PayoutData = z.infer<typeof payoutSchema>;
export type PushSubscribeData = z.infer<typeof pushSubscribeSchema>;
