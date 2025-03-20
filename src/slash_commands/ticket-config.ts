import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import { handleTicketConfigInstructions } from '../commands/ticketConfigInstructions.js'; // Ensure this relative path is correct
import { handleTicketConfigPermissions } from '../commands/ticketConfigPermissions.js'; // if needed

const data = new SlashCommandBuilder()
  .setName('ticket-config')
  .setDescription('Configure ticket settings')
  .addSubcommand((sub) =>
    sub
      .setName('instructions')
      .setDescription('Set custom instructions for a ticket type')
      .addStringOption((opt) =>
        opt
          .setName('tickettype')
          .setDescription('Which ticket type?')
          .setRequired(true)
          .setAutocomplete(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('permissions')
      .setDescription('Set permission overwrites for a ticket type')
      .addStringOption((opt) =>
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
    // Call our dedicated instructions handler to show the modal.
    await handleTicketConfigInstructions(interaction);
  } else if (subcmd === 'permissions') {
    // For now, simply call the permissions handler (or reply accordingly)
    await handleTicketConfigPermissions(interaction);
  }
}

async function autocomplete(interaction: AutocompleteInteraction) {
  // Your autocomplete code here (unchanged)
  const focusedValue = interaction.options.getFocused();
  let ticketTypes: string[] = [];
  try {
    const configs = await (await import('../utils/database.js')).default.ticketConfig.findMany();
    ticketTypes = configs.map((c: any) => c.ticketType);
  } catch (err) {
    console.error('Error fetching ticket configs:', err);
  }
  if (ticketTypes.length === 0) {
    ticketTypes = ['General', 'Store', 'Appeal', 'Partnership', 'Alt Appeal'];
  }
  const filtered = ticketTypes.filter((t) =>
    t.toLowerCase().startsWith(focusedValue.toLowerCase())
  );
  await interaction.respond(filtered.map((t) => ({ name: t, value: t })));
}

export default {
  data,
  execute,
  autocomplete,
};
