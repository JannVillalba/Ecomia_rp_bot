// models/Economia.js

const { DataTypes } = require('sequelize');
// ✅ CORRECCIÓN: Usamos desestructuración
const { sequelize } = require('../utils/db');

const Economia = sequelize.define('Economia', {
    discordId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    cartera: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    banco: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    ilegal: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    // ---- CAMPO DE INVENTARIO ----
    inventario: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "[]",
        get: function() {
            const value = this.getDataValue('inventario');
            try {
                return JSON.parse(value);
            } catch (e) {
                return []; 
            }
        },
        set: function(value) {
            return this.setDataValue('inventario', JSON.stringify(value));
        }
    }
});

module.exports = Economia;