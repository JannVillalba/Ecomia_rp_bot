// models/Vehiculo.js

const { DataTypes } = require('sequelize');
// ⚠️ Importamos el objeto { sequelize: instancia, syncModels: función }
const dbEconomia = require('../utils/db'); 

// 🚨 CORRECCIÓN CLAVE: Accedemos a la instancia de Sequelize a través de dbEconomia.sequelize
const Vehiculos = dbEconomia.sequelize.define('Vehiculo', {
    // ID automático de Sequelize
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    // ID del usuario dueño del vehículo
    discordId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    // Nombre exacto del modelo (ej: 2014 Chevlon Corbeta TZ)
    modelo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    // Placa única del vehículo
    placa: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
    },
    // 🔑 CLAVE: ID del rol de Discord asociado al vehículo (Necesario para el comando registrar-vehiculo)
    rolId: { 
        type: DataTypes.STRING,
        allowNull: false,
    },
    // Campo opcional de color que puede ser útil
    color: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Negro' 
    },
    // Campo para saber si está activo (útil para la eliminación o pérdida)
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
});

module.exports = Vehiculos;