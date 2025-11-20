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
    tipoApuesta: {
        type: String,
        required: true,
        enum: ['pleno', 'caballo', 'transversal', 'cuadro', 'seisena', 'docena', 'columna', 
               'dos-docenas', 'dos-columnas', 'rojo', 'negro', 'par', 'impar', 'falta', 'pasa']
    },
    valorApostado: {
        type: mongoose.Schema.Types.Mixed 
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    estado: {
        type: String,
        enum: ['Ganada', 'Perdida']
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