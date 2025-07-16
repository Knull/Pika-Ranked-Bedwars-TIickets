// File: src/index.ts
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { ExtendedClient, CommandModule } from './types/ExtendedClient.js';
import config from './config/config.js';
import prisma from './utils/database.js';  

import ticketConfigCommand from './slash_commands/ticket-config.js';
import { setupTicketSystem } from './handlers/ticketHandlers.js';
import { startAutoCloseManager } from './handlers/autoCloseManager.js';
import { startBlacklistManager } from './handlers/blacklistManager.js';
import { registerInteractions } from './interactions/interactionCreate.js';
import { registerCommands } from './commands/commandHandler.js';
import { populateTicketConfigs } from './utils/populateTicketConfigs.js';
export const client: ExtendedClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
}) as ExtendedClient;

client.commands = new Collection<string, CommandModule>();
client.commands.set(ticketConfigCommand.data.name, ticketConfigCommand);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);

  // Warm up the DB with a simple query
  try {
    const testQuery = await prisma.ticket.findMany({ take: 1 });
    console.log('Database warmed up. Test query result:', testQuery);
  } catch (error) {
    console.error('Error warming up DB:', error);
  }
  await prisma.ticketSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { ticketCounter: 1 }
  });
  /*
  This part has been commented out, if you're reading this un-commment it. read ./utils/populateTicketConfigs.js for more info (please).
  try {
    await populateTicketConfigs();
    console.log('TicketConfig table populated with default records.');
  } catch (error) {
    console.error('Error populating TicketConfig table:', error);
  }
  */
  await registerCommands(client);
  await setupTicketSystem(client);
  startAutoCloseManager(client);
  startBlacklistManager();
  console.log("Client is ready, commands have been set up in memory and Discord.");
});

client.on('interactionCreate', async (interaction) => {
  await registerInteractions(client, interaction);
});
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  const ticket = await prisma.ticket.findFirst({ where: { channelId: message.channel.id } });
  if (!ticket) return;
  if (message.author.id === ticket.userId) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { lastMessageAt: new Date() }
    });
  }
});
client.login(config.token);
