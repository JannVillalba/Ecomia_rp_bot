const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../data/bancos_config.json');
const personalPath = path.join(__dirname, '../../data/personal.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config-banco')
        .setDescription('Configurar tipos de cuenta para tu banco.')
        .addStringOption(option => 
            option.setName('banco')
                .setDescription('Banco a configurar')
                .setRequired(true)
                .addChoices(
                    { name: 'Assesan Bank Company', value: 'SUBSIDIARY_A' },
                    { name: 'BBVA', value: 'SUBSIDIARY_B' }
                ))
        .addStringOption(option => 
            option.setName('nombre')
                .setDescription('Nombre de la cuenta (Ej: Cuenta Joven, VIP, Empresarial)')
                .setRequired(true))
        .addNumberOption(option => 
            option.setName('costo')
                .setDescription('Costo de apertura en M$')
                .setRequired(true))
        .addNumberOption(option => 
            option.setName('tasa')
                .setDescription('Tasa de interés mensual (%)')
                .setRequired(true)),

    async execute(interaction) {
        // 1. Verificar si es staff (Admin o Trabajador)
        const personalData = JSON.parse(fs.readFileSync(personalPath, 'utf8'));
        const staff = [...(personalData.admins || []), ...(personalData.trabajadores || [])];

        if (!staff.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: "<:4666xmark:1444377925930713240> No eres empleado bancario autorizado.", 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const banco = interaction.options.getString('banco');
        const nombre = interaction.options.getString('nombre');
        const costo = interaction.options.getNumber('costo');
        const tasa = interaction.options.getNumber('tasa');

        try {
            if (!fs.existsSync(path.dirname(configPath))) fs.mkdirSync(path.dirname(configPath), { recursive: true });
            let config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : { SUBSIDIARY_A: [], SUBSIDIARY_B: [] };

            // Agregar o actualizar el tipo de cuenta
            const nuevaCuenta = { nombre, costo, tasa };
            config[banco] = config[banco].filter(c => c.nombre !== nombre); // Evitar duplicados por nombre
            config[banco].push(nuevaCuenta);

            fs.writeFileSync(configPath, JSON.stringify(config, null, 4));

            const embed = new EmbedBuilder()
                .setColor(16448250)
                .setDescription(`<a:71227checkyes:1444377968171286622> | **Producto Bancario Registrado**\n\nSe ha creado la cuenta **${nombre}** para **${banco === 'SUBSIDIARY_A' ? 'Assesan' : 'BBVA'}**.\n\n> **Costo de Apertura:** \`M$${costo}\`\n> **Interés Mensual:** \`${tasa}%\``)
                .setFooter({ text: "[MXLN] Mexico Nuevo Laredo" });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "❌ Error al guardar la configuración.", flags: [MessageFlags.Ephemeral] });
        }
    }
};