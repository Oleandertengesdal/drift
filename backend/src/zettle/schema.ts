import z from "zod";

const ProductDetailsSchema = z.object({
  sku: z.string().optional(),
  barcode: z.string().optional(),
});

const ProductSchema = z.object({
  quantity: z.string().optional(),
  type: z.string().optional(),
  productUuid: z.string().optional(),
  name: z.string().optional(),
  variantUuid: z.string().optional(),
  variantName: z.string().optional(),
  vatPercentage: z.number().optional(),
  rowTaxableAmount: z.number().optional(),
  unitPrice: z.number().optional(),
  unitName: z.string().optional(),
  comment: z.string().optional(),
  discount: z.number().optional(),
  discountValue: z.number().optional(),
  libraryProduct: z.boolean().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  fromLocationUuid: z.string().optional(),
  toLocationUuid: z.string().optional(),
  details: ProductDetailsSchema.optional(),
});

const PaymentAttributesSchema = z.object({
  cardType: z.string().optional(),
  cardPaymentEntryMode: z.string().optional(),
  maskedPan: z.string().optional(),
  applicationName: z.string().optional(),
  applicationIdentifier: z.string().optional(),
  terminalVerificationResults: z.string().optional(),
  referenceNumber: z.string().optional(),
  authorizationCode: z.string().optional(),
  transactionIdentifier: z.string().optional(),
  nrOfInstallments: z.number().optional(),
  installmentAmount: z.number().optional(),
});

const PaymentReferencesSchema = z.object({
  checkoutToken: z.string().optional(),
  orderUUID: z.string().optional(),
});

const PaymentSchema = z.object({
  uuid: z.string().optional(),
  type: z.string().optional(),
  amount: z.number().optional(),
  gratuityAmount: z.number().optional(),
  references: PaymentReferencesSchema.optional(),
  attributes: PaymentAttributesSchema.optional(),
});

const DiscountSchema = z.object({
  name: z.string().optional(),
  amount: z.number().optional(),
  percentage: z.number().optional(),
  quantity: z.number().optional(),
  value: z.number().optional(),
});

const ServiceChargeSchema = z.object({
  amount: z.number().optional(),
  title: z.string().optional(),
  vatPercentage: z.number().optional(),
  quantity: z.number().optional(),
});

export const PurchaseSchema = z.object({
  source: z.string().optional(),
  purchaseUUID1: z.string().optional(),
  timestamp: z.string().optional(),
  purchaseNumber: z.number().optional(),
  globalPurchaseNumber: z.number().optional(),
  amount: z.number().optional(),
  vatAmount: z.number().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  created: z.string().optional(),
  userDisplayName: z.string().optional(),
  customAmountSale: z.boolean().optional(),
  returnExchangePurchaseUuid: z.string().optional(),
  saleExchangePurchaseUuid: z.string().optional(),
  exchangeType: z.string().optional(),
  products: z.array(ProductSchema).optional(),
  payments: z.array(PaymentSchema).optional(),
  discounts: z.array(DiscountSchema).optional(),
  serviceCharge: ServiceChargeSchema.optional(),
});

export type Purchase = z.infer<typeof PurchaseSchema>;
