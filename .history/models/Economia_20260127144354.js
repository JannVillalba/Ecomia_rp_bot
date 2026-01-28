const { DataTypes } = require('sequelize');
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
    ilega: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    // --- Campos de Supervivencia (Art. 81, 89, 90) ---
    hambre: {
        type: DataTypes.INTEGER,
        defaultValue: 100,
    },
    sed: {
        type: DataTypes.INTEGER,
        defaultValue: 100,
    },
    lastEat: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    lastDrink: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    // --- Sistema Bancario (Art. 27) ---
    creditScore: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
    },
    // --- Inventario para Producción (Art. 91-151) ---
    inventario: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "[]",
        get() {
            const rawValue = this.getDataValue('inventario');
            try {
                return rawValue ? JSON.parse(rawValue) : [];
            } catch (e) {
                return [];
            }
        },
        set(value) {
            this.setDataValue('inventario', JSON.stringify(value));
        }
    }
});

module.exports = Economia;