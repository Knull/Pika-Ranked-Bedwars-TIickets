import { ChatInputCommandInteraction, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } from 'discord.js';
import prisma from '../utils/database.js';

export async function handleTicketConfigInstructions(interaction: ChatInputCommandInteraction): Promise<void> {
  const ticketType = interaction.options.getString('tickettype', true);

  // Define which ticket types are allowed to have custom instructions.
  // (For example, only Store, Alt Appeal, and Partnership are allowed.)
  const allowedTypes = ['Store', 'Alt Appeal', 'Partnership'];

  // Query the TicketConfig row for this ticket type.
  let configEntry = await prisma.ticketConfig.findUnique({ where: { ticketType } });

  // If an entry exists and custom instructions are not allowed, reply with an error.
  if (configEntry && !configEntry.allowCustomInstructions) {
    await interaction.reply({ 
      content: `Custom instructions are not supported for ticket type "${ticketType}".`, 
      ephemeral: true 
    });
    return;
  }

  // If no entry exists, decide based on allowedTypes:
  if (!configEntry) {
    if (!allowedTypes.includes(ticketType)) {
      await interaction.reply({ 
        content: `Custom instructions are not supported for ticket type "${ticketType}".`, 
        ephemeral: true 
      });
      return;
    }
    // Create a default config entry for allowed types.
    configEntry = await prisma.ticketConfig.create({
      data: {
        ticketType,
        allowCustomInstructions: true,
        useCustomInstructions: false,
        instructions: '',
      }
    });
  }

  // Now that we know custom instructions are allowed, show the modal pre-populated with current instructions.
  const currentInstructions = configEntry.instructions || '';
  const modal = new ModalBuilder()
    .setCustomId(`config_instructions_${ticketType}`)
    .setTitle(`Edit Instructions for ${ticketType} Tickets`);

  const instructionsInput = new TextInputBuilder()
    .setCustomId('instructions')
    .setLabel('Ticket Instructions')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(currentInstructions);

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(instructionsInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}
