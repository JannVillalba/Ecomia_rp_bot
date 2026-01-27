require('dotenv').config();
const { REST, Routes } = require('discord.js');

const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!clientId || !token || !guildId) {
  console.error('❌ Falta CLIENT_ID, DISCORD_TOKEN o DISCORD_GUILD_ID en el .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    // 🧹 Limpia SOLO comandos GUILD (en tu servidor de pruebas)
    console.log(`🧹 Eliminando comandos en el servidor ${guildId}...`);
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: [] },
    );
    console.log('✅ Todos los comandos GUILD eliminados en ese servidor.');

    // ⚠️ Si también quieres limpiar globales, descomenta esto:
    /*
    console.log('🧹 Eliminando comandos GLOBAL...');
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: [] },
    );
    console.log('✅ Todos los comandos GLOBAL eliminados.');
    */
  } catch (error) {
    console.error('❌ Error al limpiar comandos:', error);
  }
})();
