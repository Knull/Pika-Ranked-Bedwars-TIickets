// src/index.ts
import { Client, GatewayIntentBits } from 'discord.js';
import config from './config/config.js';
import { setupTicketSystem } from './handlers/ticketHandlers.js';
import { registerInteractions } from './interactions/interactionCreate.js';
import { registerCommands } from './commands/commandHandler.js';
import { startAutoCloseManager } from './handlers/autoCloseManager.js';


const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  // Post or ensure the ticket system message is in place.
  await setupTicketSystem(client);
  // Start the auto-closure manager (15-min/24-hr checks).
  startAutoCloseManager(client);
  // Register slash commands (for admin/management commands if needed)
  registerCommands(client);
});

client.on('interactionCreate', async interaction => {
  await registerInteractions(client, interaction);
});

client.login(config.token);
