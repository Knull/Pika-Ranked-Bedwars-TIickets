import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { handleRemoveCommand } from '../handlers/ticketHandlers.js';

const data = new SlashCommandBuilder()
  .setName('remove')
  .setDescription('Remove a user or role from the ticket')
  .addMentionableOption(option =>
    option
      .setName('mentionable')
      .setDescription('The user or role to remove')
      .setRequired(true)
  );

async function execute(interaction: ChatInputCommandInteraction) {
  await handleRemoveCommand(interaction);
}

export default { data, execute };
