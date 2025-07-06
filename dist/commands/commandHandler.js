// File: src/commands/commandHandler.ts
import { REST, Routes } from 'discord.js';
import config from '../config/config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
// Define __filename and __dirname when using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Read files from the commands folder
const commandsPath = path.join(__dirname, '../slash_commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));
console.log('Commands directory path:', commandsPath);
console.log('Command files found:', commandFiles);
export async function handleCommand(interaction, client) {
    if (interaction.commandName === 'add') {
        const { handleAddCommand } = await import('../handlers/ticketHandlers.js');
        await handleAddCommand(interaction);
    }
    // Other commands…
}
export async function registerCommands(client) {
    const commands = [];
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const commandModule = await import(pathToFileURL(filePath).href);
        // Unwrap the default export if it exists.
        const command = commandModule.default ?? commandModule;
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            // Also save the command to the client's command collection if needed:
            client.commands.set(command.data.name, command);
        }
    }
    console.log('Registering commands:', commands);
    const rest = new REST({ version: '10' }).setToken(config.token);
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    }
    catch (error) {
        console.error(error);
    }
}
