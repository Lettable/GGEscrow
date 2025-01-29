import mongoose from 'mongoose';

// Create the Escrow schema
const escrowSchema = new mongoose.Schema({
  buyerId: { type: String, required: true },
  sellerId: { type: String, required: true },
  buyerCryptoChoice: {
    name: { type: String, required: true },
    network: { type: String, required: true }, // e.g., 'ERC20', 'TRC20'
  },
  groupId: { type: String, required: true }, // ID of the group where the deal was initiated
  buyerAddressForPayment: { type: String, required: true }, // Address the buyer will send funds to
  sellerUSDTAddress: { type: String, required: true }, // Seller's USDT address to receive funds
  createdAt: { type: Date, default: Date.now }, // Timestamp of deal creation
  updatedAt: { type: Date, default: Date.now }, // Timestamp of last deal update
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'expired', 'canceled', 'refunded'],
    default: 'pending',
  },
  metaId: { type: String, required: true }, // Unique ID for tracking
  amountInUSDT: { type: Number, required: true }, // Total amount in USDT for the deal
  expirationTime: { type: Date }, // Time when the deal expires (set to 30 minutes from creation)
  transactionHashBuyerToBot: { type: String, default: null }, // Transaction hash of the payment from buyer to bot (if available)
  transactionHashBotToSeller: { type: String, default: null }, // Transaction hash of the transfer from bot to seller (if available)
  canceledBy: { type: String, default: null }, // User who canceled the deal (buyer/seller/admin)
  refundTime: { type: Date, default: null }, // Time when refund is processed (if applicable)
  buyerPaymentConfirmedAt: { type: Date, default: null }, // Time when payment from buyer is confirmed
  sellerPaymentConfirmedAt: { type: Date, default: null }, // Time when payment to seller is confirmed
  notes: { type: String, default: '' }, // Optional field for additional notes or details about the deal
  isRefunded: { type: Boolean, default: false }, // Flag to check if the deal was refunded
  isExpired: { type: Boolean, default: false }, // Flag to check if the deal expired
  isCompleted: { type: Boolean, default: false }, // Flag to check if the deal was completed
});

// Middleware to update `updatedAt` field when the deal is modified
escrowSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Create the Escrow model
const Escrow = mongoose.models.Escrow || mongoose.model('Escrow', escrowSchema);

export default Escrow;
