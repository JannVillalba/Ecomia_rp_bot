const { 
    SlashCommandBuilder, 
    // Componentes V2
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags // Necesario para el modo V2
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');

// --- CONSTANTES PERSONALIZADAS ---
const EMOJI_CHECK = '<a:71227checkyes:1442172457862561923>';
const EMOJI_ERROR = '<:874346wrong:1445095979253764116>';
const EMOJI_GEAR = '⚙️'; // Usamos un emoji estándar para el título del contenedor

// Función de formato de moneda (Mantenida)
const formatoMoneda = (cantidad) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(cantidad);
};

// --- FUNCIÓN PRINCIPAL DEL COMANDO ---
module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar-trabajo')
        .setDescription('Configura un trabajo para un rol, definiendo el pago y el cooldown.')
        .addRoleOption(option =>
            option.setName('rol')
                .setDescription('El rol que recibirá el pago.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('dinero')
                .setDescription('La cantidad de dinero que se pagará.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('tiempo')
                .setDescription('El tiempo de espera para el cooldown.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('unidad')
                .setDescription('La unidad de tiempo para el cooldown.')
                .setRequired(true)
                .addChoices(
                    { name: 'Minutos', value: 'minutos' },
                    { name: 'Horas', value: 'horas' },
                    { name: 'Días', value: 'dias' },
                )),
    async execute(interaction) {
        
        // Deferir la respuesta efímeramente para tener 15 minutos para la operación.
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // El ID del rol administrador que especificaste
        const ADMIN_ROLE_ID = '1460691619836723515'; 
        
        // 1. Verificar permisos (Usando editReply ya que ya fue deferida)
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.editReply({ content: `${EMOJI_ERROR} No tienes permisos para usar este comando. Se requiere el rol de configuración.`, flags: 0 });
        }

        const rol = interaction.options.getRole('rol');
        const dinero = interaction.options.getInteger('dinero');
        const tiempo = interaction.options.getInteger('tiempo');
        const unidad = interaction.options.getString('unidad');

        if (dinero <= 0 || tiempo <= 0) {
            return interaction.editReply({ content: `${EMOJI_ERROR} El dinero y el tiempo deben ser números positivos.`, flags: 0 });
        }

        try {
            // 2. LECTURA, MODIFICACIÓN Y ESCRITURA ATÓMICA DEL ARCHIVO
            
            // Re-leer el config dentro del try para asegurarnos que es la versión más reciente
            let currentConfig;
            try {
                const configData = fs.readFileSync(configPath, 'utf-8');
                currentConfig = JSON.parse(configData);
            } catch (readError) {
                console.error('Error al leer el config.json:', readError);
                currentConfig = {}; // Si hay error de lectura, inicializar un objeto vacío
            }

            // Crear el objeto jobs si no existe
            if (!currentConfig.jobs) {
                currentConfig.jobs = {};
            }

            // Guardar la configuración del trabajo
            currentConfig.jobs[rol.id] = {
                dinero: dinero,
                tiempo: tiempo,
                unidad: unidad,
            };

            // Escribir el archivo de configuración actualizado
            fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));

            // 3. MENSAJE DE CONFIRMACIÓN (Container V2)

            const container = new ContainerBuilder()
                .setAccentColor(3066993) // Azul (simulando un color de confirmación)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${EMOJI_GEAR} Trabajo Configurado ${EMOJI_CHECK}`)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`El rol **${rol.name}** (${rol.toString()}) ha sido registrado como un trabajo en \`config.json\`.`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(1).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### 💰 Pago:\n` +
                        `\`\`\`ansi\n[0;32m${formatoMoneda(dinero)}[0m\`\`\``
                    )
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### ⏱️ Cooldown:\n` +
                        `\`\`\`\n${tiempo} ${unidad}\n\`\`\``
                    )
                );

            // Responder la interacción efímeramente con el Container V2
            await interaction.editReply({ 
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                content: ''
            });

        } catch (error) {
            console.error('Error al configurar el trabajo:', error);
            // Respuesta de error efímera
            await interaction.editReply({ 
                content: `${EMOJI_ERROR} Ocurrió un error al intentar configurar el trabajo. Revisa la consola para detalles.`,
                flags: 0 
            });
        }
    }
};