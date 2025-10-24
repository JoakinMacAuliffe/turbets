const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['DEPOSITO', 'RETIRO', 'DERROTA', 'VICTORIA', 'BONUS'],
        required: true,
        trim: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    prebalance: {
        type: Number,
        required: true
    },
    postbalance: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);