const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Economia = require('../models/Economia');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aprobar-sueldo')
        .setDescription('Aprueba la solicitud de sueldo de un usuario.')
        .addUserOption(opt => opt.setName('usuario').setDescription('El empleado a pagar').setRequired(true))
        .addIntegerOption(opt => opt.setName('cantidad').setDescription('Monto a depositar').setRequired(true)),

    async execute(interaction) {
        // 1. Verificar si es Jefe en personal.json
        const personalPath = path.join(__dirname, '../../data/personal.json');
        const personal = JSON.parse(fs.readFileSync(personalPath, 'utf8'));

        if (!personal.admins.includes(interaction.user.id)) {
            return interaction.reply({ content: '❌ No tienes rango de Jefe/Dueño para aprobar pagos.', flags: MessageFlags.Ephemeral });
        }

        const empleado = interaction.options.getUser('usuario');
        const monto = interaction.options.getInteger('cantidad');

        try {
            // 2. Transacción Económica
            let [ecoEmpleado] = await Economia.findOrCreate({ where: { discordId: empleado.id } });
            let [reserva] = await Economia.findOrCreate({ where: { discordId: 'FEDERAL_RESERVE' } });

            if (reserva.banco < monto) {
                return interaction.reply({ content: '<:4666xmark:1444377925930713240> La Reserva Federal no tiene fondos suficientes para este pago.', flags: MessageFlags.Ephemeral });
            }

            // Quitar de la Reserva y dar al Empleado (Cartera)
            await reserva.decrement('banco', { by: monto });
            await ecoEmpleado.increment('cartera', { by: monto });

            await interaction.reply({ 
                content: `<a:71227checkyes:1444377968171286622> **PAGO APROBADO**: Se han transferido **$${monto.toLocaleString()}** de la Reserva Federal a la cartera de ${empleado}.`,
            });

            // Notificar al empleado por DM
            await empleado.send(`✨ Tu sueldo por **$${monto.toLocaleString()}** ha sido aprobado por un superior.`).catch(() => {});

        } catch (error) {
            console.error(error);
            interaction.reply({ content: '<:4666xmark:1444377925930713240> Error en la base de datos al procesar el pago.', flags: MessageFlags.Ephemeral });
        }
    }
};