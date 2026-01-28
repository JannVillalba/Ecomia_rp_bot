const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

// IDs de los Patrones autorizados
const PATRONES = [
    "581514876460204062",
    "609151596408078341",
    "1019837159806599200"
];

const personalPath = path.join(__dirname, '../../data/personal.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-personal')
        .setDescription('Designar personal administrativo o bancario.')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('El ciudadano a contratar')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('rango')
                .setDescription('Rango dentro del sistema financiero')
                .setRequired(true)
                .addChoices(
                    { name: 'Administrador (Puede inyectar capital)', value: 'admin' },
                    { name: 'Trabajador (Puede gestionar préstamos)', value: 'trabajador' }
                )),

    async execute(interaction) {
        // 1. Verificación de Patrón
        if (!PATRONES.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: "<:4666xmark:1444377925930713240> No tienes los permisos de alta jerarquía para ejecutar este comando.", 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const target = interaction.options.getUser('usuario');
        const rango = interaction.options.getString('rango');

        try {
            // 2. Asegurar que el archivo y carpeta existan
            const dir = path.dirname(personalPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            if (!fs.existsSync(personalPath)) fs.writeFileSync(personalPath, JSON.stringify({ admins: [], trabajadores: [] }, null, 4));

            // 3. Leer datos actuales
            const data = JSON.parse(fs.readFileSync(personalPath, 'utf8'));

            // 4. Limpiar al usuario de rangos previos (para que no tenga ambos)
            data.admins = data.admins.filter(id => id !== target.id);
            data.trabajadores = data.trabajadores.filter(id => id !== target.id);

            // 5. Asignar nuevo rango
            if (rango === 'admin') {
                data.admins.push(target.id);
            } else {
                data.trabajadores.push(target.id);
            }

            // 6. Guardar cambios
            fs.writeFileSync(personalPath, JSON.stringify(data, null, 4));

            const embed = new EmbedBuilder()
                .setColor(16448250)
                .setDescription(` > <a:71227checkyes:1444377968171286622> | **Contratación Exitosa**\n\nEl usuario <@${target.id}> ha sido asignado como **${rango.toUpperCase()}** en el sistema de Nuevo Laredo.`)
                .setFooter({ 
                    text: "[MXLN] Mexico Nuevo Laredo", 
                    iconURL: "https://cdn.discordapp.com/icons/1377710554663358494/f37a322cda3fefecf7d691b32a530275.png" 
                });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error("Error en set-personal:", error);
            await interaction.reply({ content: "<:4666xmark:1444377925930713240> Error al actualizar el registro de personal.", flags: [MessageFlags.Ephemeral] });
        }
    }
};