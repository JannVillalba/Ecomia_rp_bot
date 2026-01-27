require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// ╭───────────────────────────────╮
// │ ⚙️ UTILIDADES               │
// ╰───────────────────────────────╯
const logBox = (title, message, type = "INFO") => {
  const colors = {
    INFO: "\x1b[36m",
    SUCCESS: "\x1b[32m",
    ERROR: "\x1b[31m",
    WARN: "\x1b[33m",
  };
  const reset = "\x1b[0m";
  console.log(`
╔════════════════════════════════════════════════╗
║ ${colors[type]}${title.padEnd(20)}${reset} │ ${message}
╚════════════════════════════════════════════════╝`);
};

// --- CONFIGURACIÓN ---
const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const mode = process.env.COMMAND_MODE || 'guild';

if (!clientId || !token) {
  logBox('❌ ERROR DE ENTORNO', 'Falta CLIENT_ID o DISCORD_TOKEN en el .env', 'ERROR');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

// --- CARGAR COMANDOS ---
let commands = [];
if (!mode.startsWith('clean')) {
  logBox('⚙️ INICIO DE CARGA', `Cargando comandos desde la carpeta /commands...`, 'INFO');
  const commandsPath = path.join(__dirname, 'commands');
  
  if (!fs.existsSync(commandsPath)) {
      logBox('❌ ERROR DE CARGA', `La carpeta /commands no existe en ${commandsPath}`, 'ERROR');
      process.exit(1);
  }

  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            logBox('✅ CMD ENCONTRADO', `Comando: /${command.data.name}`, 'SUCCESS');
            commands.push(command.data.toJSON());
        } else {
            logBox('⚠️ ADVERTENCIA', `El archivo ${file} no tiene "data" o "execute".`, 'WARN');
        }
    } catch (error) {
        // Añadimos el nombre del archivo para identificar dónde falla la sintaxis o la descripción
        logBox('❌ ERROR DE VALIDACIÓN', `Falló el archivo: ${file}. Revisa .setDescription().`, 'ERROR');
        console.error(error); // Imprime el stack trace detallado para saber el error exacto (como el ValidationError)
        process.exit(1); // Detiene el despliegue si un comando es inválido
    }
  }
}

// --- DESPLIEGUE ASÍNCRONO ---
(async () => {
  try {
    if (mode === 'guild') {
      logBox('🚀 REGISTRO GUILD', `Registrando ${commands.length} comando(s) en el servidor ${guildId}...`, 'INFO');
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      logBox('✅ ÉXITO', 'Comandos GUILD registrados con éxito.', 'SUCCESS');
    } 
    
    else if (mode === 'global') {
      logBox('🌍 REGISTRO GLOBAL', `Registrando ${commands.length} comando(s) globales...`, 'INFO');
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      logBox('✅ ÉXITO', 'Comandos GLOBAL registrados con éxito (puede tardar ~1h).', 'SUCCESS');
    } 
    
    else if (mode === 'clean-guild') {
      logBox('🧹 LIMPIEZA GUILD', `Limpiando comandos en el servidor ${guildId}...`, 'INFO');
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
      logBox('✅ ÉXITO', 'Comandos GUILD eliminados.', 'SUCCESS');
    } 
    
    else if (mode === 'clean-global') {
      logBox('🧹 LIMPIEZA GLOBAL', 'Limpiando comandos GLOBAL...', 'INFO');
      await rest.put(Routes.applicationCommands(clientId), { body: [] });
      logBox('✅ ÉXITO', 'Comandos GLOBAL eliminados.', 'SUCCESS');
    } 
    
    else {
      logBox('❌ ERROR DE MODO', 'COMMAND_MODE inválido. Usa: guild | global | clean-guild | clean-global', 'ERROR');
    }
  } catch (error) {
    logBox('❌ ERROR DE REGISTRO', `Fallo al registrar/limpiar comandos: ${error.message}`, 'ERROR');
    console.error(error); // Imprime el error completo de la API de Discord
  }
})();