const { SlashCommandBuilder } = require('discord.js');

// Simulación de función para designar admin/cajero
function setAdminBank({ userId, role, bancoId }) {
    // Aquí deberías guardar la designación en la base de datos
    return true;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-admin-bank')
        .setDescription('Designa a un usuario como administrador o cajero del banco.')
        .addUserOption(opt =>
            opt.setName('usuario')
                .setDescription('Usuario a designar')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('rol')
                .setDescription('admin o cajero')
                .setRequired(true)
                .addChoices(
                    { name: 'admin', value: 'admin' },
                    { name: 'cajero', value: 'cajero' }
                )
        ),
    async execute(interaction) {
        const userId = interaction.options.getUser('usuario').id;
        const role = interaction.options.getString('rol');
        const bancoId = interaction.guildId; // O usa otro identificador de banco

        setAdminBank({ userId, role, bancoId });

        await interaction.reply({ content: `Usuario designado como ${role} correctamente.`, ephemeral: true });
    },
};
