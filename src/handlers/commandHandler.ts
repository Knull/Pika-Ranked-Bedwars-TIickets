// src/commands/commandHandler.ts
import { CommandInteraction, Client } from 'discord.js';

export async function handleCommand(interaction: CommandInteraction, client: Client) {
  if (interaction.commandName === 'add') {
    const { handleAddCommand } = await import('../handlers/ticketHandlers.js');
    await handleAddCommand(interaction);
  }
  // Other commands (close, claim, remove, etc.) can be handled here.
}

export function registerCommands(client: Client) {
  // Optionally register slash commands with Discord if needed.
}
