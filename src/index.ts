// File: src/index.ts
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { ExtendedClient, CommandModule } from './types/ExtendedClient.js';
import config from './config/config.js';
import prisma from './utils/database.js';  // Import your Prisma client

import ticketConfigCommand from './slash_commands/ticket-config.js';
import { setupTicketSystem } from './handlers/ticketHandlers.js';
import { startAutoCloseManager } from './handlers/autoCloseManager.js';
import { registerInteractions } from './interactions/interactionCreate.js';
import { registerCommands } from './commands/commandHandler.js';
import { populateTicketConfigs } from './utils/populateTicketConfigs.js';
// 1. Initialize the client as ExtendedClient
const client: ExtendedClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
}) as ExtendedClient;

// 2. Make a commands Collection
client.commands = new Collection<string, CommandModule>();

// 3. Put our /ticket-config command in that collection
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
  // /*
  try {
    await populateTicketConfigs();
    console.log('TicketConfig table populated with default records.');
  } catch (error) {
    console.error('Error populating TicketConfig table:', error);
  }
  // */
  // Register slash commands from slash_commands folder
  await registerCommands(client);

  // Run additional startup routines
  await setupTicketSystem(client);
  startAutoCloseManager(client);
  console.log("Client is ready, commands have been set up in memory and Discord.");
});

// 5. Centralized interaction handling
client.on('interactionCreate', async (interaction) => {
  await registerInteractions(client, interaction);
});
client.on('messageCreate', async (message) => {
  // Ignore bot messages.
  if (message.author.bot) return;
  
  // Check if this channel is a ticket channel by looking up a ticket record.
  const ticket = await prisma.ticket.findFirst({ where: { channelId: message.channel.id } });
  if (!ticket) return;
  
  // Only update if the message author is the ticket creator.
  if (message.author.id === ticket.userId) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { lastMessageAt: new Date() }
    });
  }
});
// 6. Finally log in
client.login(config.token);
