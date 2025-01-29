// Desc: Invoice model
import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    paymentId: {
        type: String,
        required: true,
        trim: true
    },
    purchaseId: {
        type: String,
        required: true,
        trim: true
    },
    paymentObjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true
    },
    payCurrency: {
        type: String,
        required: true
    },
    payAmount: {
        type: String,
        required: true
    },
    payAddress: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    amountReceived: {
        type: String,
        required: true
    },
    orderId: {
        type: String,
        required: true
    },
    orderDescription: {
        type: String
    },
    ipnCallbackUrl: {
        type: String,
        required: true
    },
    network: {
        type: String,
        required: true
    },
    isFixedRate: {
        type: Boolean,
        required: true
    },
    isFeePaidByUser: {
        type: Boolean,
        required: true
    },
    originIp: {
        type: String,
        required: false
    },
    paymentStatus: {
        type: String,
        enum: ['waiting', 'creating', 'processing', 'sending', 'finished', 'failed', 'rejected'],
        default: 'waiting'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    },
    paidAt: {
        type: Date
    }
}, {
    timestamps: true
});

paymentSchema.index({ orderId: 1, createdAt: -1 });
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ paymentStatus: 1 });

const Payment = mongoose.model('Invoice', paymentSchema);

export default Payment;