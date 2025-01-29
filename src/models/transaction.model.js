// Desc: Transaction model
import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    groupId: {
        type: String,
        required: true,
        trim: true
    },
    buyerId: {
        type: String,
        required: true,
        trim: true
    },
    buyerName: {
        type: String,
        required: true,
        trim: true
    },
    sellerId: {
        type: String,
        required: true,
        trim: true
    },
    sellerName: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true
    },
    buyerPreferedCurrency: {
        type: String,
        required: true
    },
    sellerPreferedCurrency: {
        type: String,
        required: true
    },
    sellerWalletAddress: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    gassFeePaidByUser: {
        type: Boolean,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    }
});

transactionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;