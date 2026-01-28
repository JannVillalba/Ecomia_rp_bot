const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Economy = require('../models/Economia');
const fs = require('fs');
const path = require('path');

// Ruta al archivo de personal autorizado
const personalPath = path.join(__dirname, '../../data/personal.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inyectar-capital')
        .setDescription('Emisión de capital para el Banco de México.')
        .addNumberOption(option => 
            option.setName('monto')
                .setDescription('Monto total a distribuir (50% Central, 25% Assesan, 25% BBVA)')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction) {
        // 1. Verificar autorización desde personal.json
        let autorizado = false;
        try {
            const personalData = JSON.parse(fs.readFileSync(personalPath, 'utf8'));
            // Asumiendo que personal.json es un array de IDs o tiene una propiedad "admins"
            // Ajusta 'personalData.admins' según la estructura de tu JSON
            const listaAdmins = Array.isArray(personalData) ? personalData : (personalData.admins || []);
            
            if (listaAdmins.includes(interaction.user.id)) {
                autorizado = true;
            }
        } catch (err) {
            console.error("Error leyendo personal.json:", err);
            return interaction.reply({ content: "<:4666xmark:1444377925930713240> Error al verificar permisos.", flags: [MessageFlags.Ephemeral] });
        }

        if (!autorizado) {
            return interaction.reply({ 
                content: "<:4666xmark:1444377925930713240> No tienes autorización de la Secretaría de Hacienda para esta acción.", 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const montoTotal = interaction.options.getNumber('monto');

        try {
            // Lógica de porcentajes (50/25/25)
            const central = montoTotal * 0.50;
            const subA = montoTotal * 0.25;
            const subB = montoTotal * 0.25;

            const entidades = [
                { id: 'FEDERAL_RESERVE', monto: central },
                { id: 'SUBSIDIARY_A', monto: subA },
                { id: 'SUBSIDIARY_B', monto: subB }
            ];

            for (const data of entidades) {
                let [entity] = await Economy.findOrCreate({ 
                    where: { discordId: data.id },
                    defaults: { banco: 0, cartera: 0, ilega: 0, creditScore: 10 }
                });
                
                await entity.update({ banco: entity.banco + data.monto });
            }

            // Embed básico estilo makial
            const embed = new EmbedBuilder()
                .setColor(16448250)
                .setDescription("<a:71227checkyes:1444377968171286622>  | Capital inyectado")
                .setFooter({ 
                    text: "[MXLN] Mexico Nuevo ladero", 
                    iconURL: "https://images-ext-1.discordapp.net/external/HgQ_1OH-lZ46gsA90Wc7QnIbhFn80fNA3d1HPoPDd20/%3Fsize%3D4096/https/cdn.discordapp.com/icons/1377710554663358494/f37a322cda3fefecf7d691b32a530275.png?format=webp&quality=lossless&width=960&height=960" 
                });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "<:4666xmark:1444377925930713240> Error en la base de datos bancaria.", flags: [MessageFlags.Ephemeral] });
        }
    }
};