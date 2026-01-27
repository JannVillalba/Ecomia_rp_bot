// utils/dbCedula.js

const { Sequelize } = require('sequelize');

const cedulaDb = new Sequelize({
  dialect: 'sqlite',
  storage: './cedulas.sqlite', // Este es el nuevo archivo para los datos de cédula
  logging: false,
});

/**
 * Sincroniza los modelos relacionados con la cédula.
 */
async function syncModels() {
    try {
        // Asegúrate de requerir tu modelo de cédula aquí si es necesario
        // require('../models/Cedula'); 
        
        await cedulaDb.sync({ alter: true }); 
        console.log('✅ DB Cédulas y modelos sincronizados correctamente.');
    } catch (error) {
        console.error('❌ Error al sincronizar la base de datos de cédulas:', error);
    }
}

// 2. Exportación Corregida: Exportamos la instancia bajo la clave 'sequelize'
module.exports = {
    sequelize: cedulaDb, // 👈 ¡ESTO ARREGLA EL ERROR!
    syncModels
};