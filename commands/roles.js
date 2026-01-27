const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roles')
        .setDescription('Muestra el nombre y el ID de todos los roles del servidor.'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const roles = interaction.guild.roles.cache;
        const filteredRoles = roles.filter(role => role.name !== '@everyone').sort((a, b) => b.position - a.position);
        
        const rolesPerField = 10;
        const rolesList = [];

        for (let i = 0; i < filteredRoles.size; i += rolesPerField) {
            const chunk = filteredRoles.slice(i, i + rolesPerField);
            const fieldText = chunk.map(role => `**${role.name}**: \`${role.id}\``).join('\n');
            rolesList.push(fieldText);
        }

        if (rolesList.length === 0) {
            return interaction.editReply('No hay roles disponibles, o no se pudieron cargar.');
        }

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('📄 Lista de Roles y IDs')
            .setTimestamp();

        rolesList.forEach((text, index) => {
            embed.addFields({
                name: `Roles (parte ${index + 1})`,
                value: text,
                inline: false
            });
        });

        await interaction.editReply({ embeds: [embed] });
    }
};