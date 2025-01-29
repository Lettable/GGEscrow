// Decs: Group model
import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const GroupSchema = new Schema({
    groupId: {
        type: String,
        required: true,
        unique: true
    },
    addedByName: {
        type: String,
        required: true
    },
    addedById: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Group', GroupSchema);