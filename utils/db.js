// utils/db.js

const { Sequelize } = require('sequelize');

// 1. Instancia de Sequelize
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite', // Archivo para la base de datos principal
  logging: false
});

// Función para sincronizar modelos (Vehiculo y Economia)
async function syncModels() {
    try {
        require('../models/Vehiculo'); 
        require('../models/Economia'); 
        
        await sequelize.sync({ alter: true }); 
        console.log('✅ DB Principal y modelos sincronizados correctamente.');
    } catch (error) {
        console.error('❌ Error al sincronizar la base de datos principal:', error);
    }
}

// 2. Exportación
module.exports = {
    // 👈 ESTO ES LO QUE ARREGLA EL ERROR 'undefined'
    sequelize, 
    syncModels
};