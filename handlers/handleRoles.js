// handlers/handleRoles.js

const { 
    ButtonInteraction, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    MessageFlags,
    PermissionsBitField 
} = require('discord.js');

// --- CONSTANTES DE COLOR ---
const COLOR_EXITO = 0x22c55e;
const COLOR_ERROR_MODAL = 0xE74C3C; // Usamos un color para denegado/error
const COLOR_ACEPTADO = 0x2ECC71; 
const COLOR_DENEGADO = 0xF1C40F;
const COLOR_ERROR_GESTION = 0x861313;

// --- EMOJIS ---
const EMOJI_EXITO = '<a:71227checkyes:1442172457862561923>';
const EMOJI_ERROR = '<:4666xmark:1435374785419935955>';


/**
 * Gestiona las interacciones de botones para solicitudes y remoción de roles.
 * @param {ButtonInteraction} interaction La interacción del botón.
 * @param {object} constants Constantes pasadas desde index.js (ADMIN_ROLE_GESTION, BOT_PERMISSION_ID, logBox).
 * @returns {Promise<void>}
 */
module.exports = async (interaction, { ADMIN_ROLE_GESTION, BOT_PERMISSION_ID, logBox }) => {
    
    // 1. Deferir la actualización
    await interaction.deferUpdate();

    // 2. Verificación de Permisos del Staff
    const hasAdminRole = interaction.member.roles.cache.has(ADMIN_ROLE_GESTION);
    const hasBotPermissionRole = interaction.member.roles.cache.has(BOT_PERMISSION_ID);
    const hasManageRolesPermission = interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles);

    if (!hasAdminRole && !hasBotPermissionRole && !hasManageRolesPermission) {
        return interaction.followUp({ 
            content: `${EMOJI_ERROR} Solo el Staff (Admin o autorizado) puede gestionar estas solicitudes.`, 
            ephemeral: true 
        });
    }

    // 3. Extracción de datos del Custom ID
    // Formato: rol_tipo_accion_targetUserId_targetRoleId
    const parts = interaction.customId.split('_');
    const [_, tipo, action, targetUserId, targetRoleId] = parts;
    
    const staffUser = interaction.user;
    
    // 4. Preparación de datos y verificación de existencia
    const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
    const targetRole = interaction.guild.roles.cache.get(targetRoleId);
    let finalContainer;
    let finalMessage = '';

    // Si el miembro o el rol ya no existen
    if (!targetMember || !targetRole) {
        finalContainer = new ContainerBuilder()
            .setAccentColor(COLOR_ERROR_GESTION)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${EMOJI_ERROR} SOLICITUD INVÁLIDA (FINALIZADA)`),
                new TextDisplayBuilder().setContent(`> El miembro o el rol ya no existe en el servidor. Gesto por <@${staffUser.id}>.`)
            );
        finalMessage = `${EMOJI_ERROR} Error de Gestión: El usuario o rol no existe.`;

    } else if (action === 'aceptar') {
        try {
            const isSolicitud = tipo === 'solicitar';
            
            // Acción: Añadir (solicitar) o Remover (remover)
            const roleAction = isSolicitud ? targetMember.roles.add(targetRole) : targetMember.roles.remove(targetRole);
            await roleAction;

            const accionTexto = isSolicitud ? 'AÑADIDO' : 'REMOVIDO';
            
            finalContainer = new ContainerBuilder()
                .setAccentColor(COLOR_ACEPTADO)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${EMOJI_EXITO} GESTIÓN ACEPTADA: ROL ${accionTexto}`),
                    new TextDisplayBuilder().setContent(
                        `> El rol \`${targetRole.name}\` ha sido **${accionTexto.toLowerCase()}** de <@${targetUserId}>.`
                    )
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**🧑‍💼 Gestionado por:** ${staffUser}`)
                );
            finalMessage = `${EMOJI_EXITO} Solicitud **ACEPTADA** por ${staffUser.tag}. Rol \`${targetRole.name}\` ${accionTexto.toLowerCase()} a ${targetMember.user.tag}.`;

        } catch (error) {
            logBox(`Error Gestionando Rol`, `${tipo} rol ${targetRole.name} para ${targetMember.user.tag}: ${error.message}`, "ERROR");
            finalContainer = new ContainerBuilder()
                .setAccentColor(COLOR_ERROR_GESTION)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${EMOJI_ERROR} ERROR EN LA GESTIÓN`),
                    new TextDisplayBuilder().setContent(`> No pude gestionar el rol. Asegúrate de permisos y jerarquía de roles.`)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**🧑‍💼 Gestionado por:** ${staffUser}`)
                );
            finalMessage = `${EMOJI_ERROR} Error al gestionar el rol \`${targetRole.name}\`. Revisa los logs.`;
        }

    } else if (action === 'denegar') {
        // Denegar la acción (sin cambios de rol)
        finalContainer = new ContainerBuilder()
            .setAccentColor(COLOR_DENEGADO)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${EMOJI_ERROR} SOLICITUD DENEGADA`),
                new TextDisplayBuilder().setContent(
                    `> La solicitud de **${tipo}** el rol \`${targetRole.name}\` para <@${targetUserId}> ha sido **denegada**.`
                )
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**🧑‍💼 Gestionado por:** ${staffUser}`)
            );
        finalMessage = `${EMOJI_ERROR} Solicitud **DENEGADA** por ${staffUser.tag}. Rol \`${targetRole.name}\` no modificado.`;
    }

    // 5. Edición Final del Mensaje (Quitar botones y mostrar resultado V2)
    await interaction.editReply({
        components: [finalContainer], // Solo el Container V2 de resultado
        content: '', // Obligatorio vacío
        flags: MessageFlags.IsComponentsV2, // Mantenemos el flag V2 para el Container
        files: [] // Eliminamos los archivos adjuntos (evidencia)
    });
    
    // 6. Notificar al Staff que ejecutó la acción
    await interaction.followUp({ content: finalMessage, ephemeral: true });
};