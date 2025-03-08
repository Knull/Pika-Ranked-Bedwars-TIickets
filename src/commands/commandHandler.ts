import { CommandInteraction, Client } from 'discord.js';

export async function handleCommand(interaction: CommandInteraction, client: Client) {
  if (interaction.commandName === 'add') {
    const { handleAddCommand } = await import('../handlers/ticketHandlers.js');
    await handleAddCommand(interaction);
  }
  // Other admin/management commands…
}

export function registerCommands(client: Client) {
  // Register slash commands if desired.
}
