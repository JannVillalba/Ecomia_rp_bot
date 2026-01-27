// models/Cedula.js

const { DataTypes } = require('sequelize');
// ⚠️ Importamos el objeto { sequelize: cedulaDb, syncModels: ... }
const dbCedula = require('../utils/dbCedula'); 

// 🚨 CORRECCIÓN CLAVE: Usamos dbCedula.sequelize para acceder a la instancia que tiene el método .define()
const Cedula = dbCedula.sequelize.define('Cedula', {
  discordId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  nombres: {
    type: DataTypes.STRING,
    allowNull: false
  },
  apellidos: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fecha: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lugar: {
    type: DataTypes.STRING,
    allowNull: false
  },
  usuarioRoblox: {
    type: DataTypes.STRING,
    allowNull: false
  },
  genero: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tipoSangre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nacionalidad: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cedulaId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  antecedentes: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  totalPrision: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalMulta: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

module.exports = Cedula;