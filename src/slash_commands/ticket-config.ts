import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import prisma from '../utils/database.js';

const data = new SlashCommandBuilder()
  .setName('ticket-config')
  .setDescription('Configure ticket settings')
  .addSubcommand(sub =>
    sub
      .setName('instructions')
      .setDescription('Set custom instructions for a ticket type')
      .addStringOption(opt =>
        opt
          .setName('tickettype')
          .setDescription('Which ticket type?')
          .setRequired(true)
          .setAutocomplete(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('permissions')
      .setDescription('Set permission overwrites for a ticket type')
      .addStringOption(opt =>
        opt
          .setName('tickettype')
          .setDescription('Which ticket type?')
          .setRequired(true)
          .setAutocomplete(true)
      )
  );

async function execute(interaction: ChatInputCommandInteraction) {
  const subcmd = interaction.options.getSubcommand(true);
  if (subcmd === 'instructions') {
    const { handleTicketConfigInstructions } = await import('../commands/ticketConfigInstructions.js');
    await handleTicketConfigInstructions(interaction);
  } else if (subcmd === 'permissions') {
    const { handleTicketConfigPermissions } = await import('../commands/ticketConfigPermissions.js');
    await handleTicketConfigPermissions(interaction);
  }
}

async function autocomplete(interaction: AutocompleteInteraction) {
  const focusedValue = interaction.options.getFocused();
  let ticketTypes: string[] = [];
  try {
    const configs = await prisma.ticketConfig.findMany();
    ticketTypes = configs.map((c: any) => c.ticketType);
  } catch (err) {
    console.error('Error fetching ticket configs:', err);
  }
  // Fallback: include all supported types if none exist.
  if (ticketTypes.length === 0) {
    ticketTypes = ['General', 'Store', 'Alt Appeal', 'Partnership'];
  }
  const filtered = ticketTypes.filter(t =>
    t.toLowerCase().startsWith(focusedValue.toLowerCase())
  );
  await interaction.respond(filtered.map(t => ({ name: t, value: t })));
}

export default {
  data,
  execute,
  autocomplete,
};
