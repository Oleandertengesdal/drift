import z from "zod";

// const ProductDetailsSchema = z.object({
//   sku: z.string().optional(),
//   barcode: z.string().optional(),
// });

const ProductSchema = z.object({
  quantity: z.string().optional(),
  type: z.string().optional(),
  productUuid: z.string().optional(),
  name: z.string().optional(),
  variantUuid: z.string().optional(),
  variantName: z.string().optional(),
  unitPrice: z.number().optional(),
  unitName: z.string().optional(),
  // comment: z.string().optional(),
  // libraryProduct: z.boolean().optional(),
  // sku: z.string().optional(),
  // barcode: z.string().optional(),
  // fromLocationUuid: z.string().optional(),
  // toLocationUuid: z.string().optional(),
  // details: ProductDetailsSchema.optional(),
});

const CardAttributeSchema = z.object({
  maskedPan: z.string().optional(),
  cardType: z.string().optional(),
  cardPaymentEntryMode: z.string().optional(),
});

const PaymentSchema = z.object({
  uuid: z.string().optional(),
  type: z.string().optional(),
  amount: z.number().optional(),
  gratuityAmount: z.number().optional(),
  cardAttributes: CardAttributeSchema.optional(),
});

export const LeaderboardSchema = z.object({
  maskedPan: z.string().optional(),
  cardType: z.string().optional(),
  displayName: z.string().optional(),
  totalAmount: z.number().optional(),
  purchaseCount: z.number().optional(),
  lastSeen: z.string().optional(),
});

export type Leaderboard = z.infer<typeof LeaderboardSchema>;

export const PurchaseSchema = z.object({
  source: z.string().optional(),
  purchaseUUID1: z.string().optional(),
  timestamp: z.string().optional(),
  purchaseNumber: z.number().optional(),
  globalPurchaseNumber: z.number().optional(),
  amount: z.number().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  created: z.string().optional(),
  customAmountSale: z.boolean().optional(),
  exchangeType: z.string().optional(),
  products: z.array(ProductSchema).optional(),
  payments: z.array(PaymentSchema).optional(),
});

export type Purchase = z.infer<typeof PurchaseSchema>;
