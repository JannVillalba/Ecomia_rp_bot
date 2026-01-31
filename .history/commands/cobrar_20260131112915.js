const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

const CANAL_SOLICITUDES = '1465725546779639960'; 
const CANAL_PERMITIDO = '1460692332545310813';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cobrar')
        .setDescription('Envía tu solicitud de sueldo a revisión.')
        .addStringOption(opt => opt.setName('trabajo').setDescription('Empresa/Institución').setRequired(true))
        .addStringOption(opt => opt.setName('evidencia').setDescription('Link de la evidencia (Imgur, Discord, etc)').setRequired(true)),

    async execute(interaction) {
        if (interaction.channelId !== CANAL_PERMITIDO) {
            return interaction.reply({ content: `❌ Solo puedes cobrar en <#${CANAL_PERMITIDO}>.`, flags: MessageFlags.Ephemeral });
        }

        const trabajo = interaction.options.getString('trabajo');
        const evidencia = interaction.options.getString('evidencia');
        const canalAdmin = interaction.guild.channels.cache.get(CANAL_SOLICITUDES);

        // Mensaje para los Jefes
        const reporteJefes = new ContainerBuilder()
            .setAccentColor(3487029)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# 📑 SOLICITUD DE PAGO\n` +
                    `**Empleado:** ${interaction.user} (\`${interaction.user.id}\`)\n` +
                    `**Empresa:** ${trabajo}\n` +
                    `**Evidencia:** [CLICK AQUÍ PARA VER](${evidencia})\n\n` +
                    `> **Para procesar usa:**\n` +
                    `> \`/aprobar-sueldo usuario:${interaction.user.id} cantidad:VALOR\`\n` +
                    `> \`/rechazar-sueldo usuario:${interaction.user.id} razon:MOTIVO\``
                )
            );

        await canalAdmin.send({ components: [reporteJefes], flags: MessageFlags.IsComponentsV2 });

        // Respuesta visual al usuario (la que me pasaste)
        const userContainer = new ContainerBuilder()
            .setAccentColor(3487029)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## <a:71227checkyes:1444377968171286622> Sueldo solicitado correctamente.\n` +
                    `> Espera que el jefe o dueño de la institucion/empresa acepte tu solicitud de dinero.`
                )
            );

        await interaction.reply({ components: [userContainer], flags: MessageFlags.IsComponentsV2 });
    }
};