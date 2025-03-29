import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { handleAddCommand } from '../handlers/ticketHandlers.js';

const data = new SlashCommandBuilder()
  .setName('add')
  .setDescription('Add a user or role to the ticket')
  .addMentionableOption(option =>
    option
      .setName('mentionable')
      .setDescription('The user or role to add')
      .setRequired(true)
  );

async function execute(interaction: ChatInputCommandInteraction) {
  await handleAddCommand(interaction);
}

export default { data, execute };
