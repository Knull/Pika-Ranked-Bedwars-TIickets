// File: src/commands/commandHandler.ts
import { CommandInteraction, Client, REST, Routes } from 'discord.js';
import config from '../config/config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commandsPath = path.join(__dirname, '../slash_commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file =>
  file.endsWith('.js') || file.endsWith('.ts')
);
console.log('Commands directory path:', commandsPath);
console.log('Command files found:', commandFiles);

export async function handleCommand(interaction: CommandInteraction, client: Client) {
  if (interaction.commandName === 'add') {
    const { handleAddCommand } = await import('../handlers/ticketHandlers.js');
    await handleAddCommand(interaction);
  }
}

export async function registerCommands(client: any) {
  const commands = [];
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = await import(pathToFileURL(filePath).href);
    const command = commandModule.default ?? commandModule;
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      client.commands.set(command.data.name, command);
    }
  }
  console.log('Registering commands:', commands);

  const rest = new REST({ version: '10' }).setToken(config.token);
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}