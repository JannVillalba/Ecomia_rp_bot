'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // Paso 1: Añadir la columna sin la restricción UNIQUE
    await queryInterface.addColumn('Cedulas', 'cedulaId', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    // Paso 2: Añadir la restricción UNIQUE en un paso separado
    await queryInterface.addConstraint('Cedulas', {
      fields: ['cedulaId'],
      type: 'unique',
      name: 'unique_cedulaId_constraint' // Opcional, pero buena práctica
    });
  },

  async down (queryInterface, Sequelize) {
    // Revertir los cambios en el orden inverso
    await queryInterface.removeConstraint('Cedulas', 'unique_cedulaId_constraint');
    await queryInterface.removeColumn('Cedulas', 'cedulaId');
  }
};