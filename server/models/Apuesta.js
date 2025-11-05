const mongoose = require('mongoose');

const apuestaSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    monto: {
        type: mongoose.Types.Decimal128,
        required: true,
    },
    tipoApuesta: {  // NUEVO
        type: String,
        required: true,
        enum: ['pleno', 'rojo', 'negro', 'par', 'impar', 'falta', 'pasa', 'docena', 'columna']
    },
    valorApostado: {  // NUEVO
        type: mongoose.Schema.Types.Mixed  // Puede ser número, string, etc.
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    estado: {
        type: String,
        default: 'En progreso',
        enum: ['En progreso', 'Ganada', 'Perdida']
    },
    numeroGanador: {
        type: Number
    },
    pago: {
        type: mongoose.Types.Decimal128,
        default: 0
    }
});

module.exports = mongoose.model('Apuesta', apuestaSchema);