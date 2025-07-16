// src/commands/commandHandler.ts
import { CommandInteraction, Client } from 'discord.js';

export async function handleCommand(interaction: CommandInteraction, client: Client) {
  if (interaction.commandName === 'add') {
    const { handleAddCommand } = await import('../handlers/ticketHandlers.js');
    await handleAddCommand(interaction);
  }
  // doesn't handle commands im just too lazy to move add
}

export function registerCommands(client: Client) {
  // if you're seeing this, you are a nerd 🤓🤓🤓🤓
}
