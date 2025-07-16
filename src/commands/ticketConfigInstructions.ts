import { 
  ChatInputCommandInteraction, 
  ModalBuilder, 
  TextInputBuilder, 
  ActionRowBuilder, 
  TextInputStyle 
} from 'discord.js';
import prisma from '../utils/database.js';

export async function handleTicketConfigInstructions(interaction: ChatInputCommandInteraction): Promise<void> {
  const ticketType = interaction.options.getString('tickettype', true);

  if (!interaction.guild) {
    await interaction.reply({ content: 'Guild not found', ephemeral: true });
    return;
  }

  const allowedTypes = ['Store', 'Alt Appeal', 'Partnership'];

  let configEntry = await prisma.ticketConfig.findUnique({ where: { ticketType } });

  if (configEntry && !configEntry.allowCustomInstructions) {
    await interaction.reply({ 
      content: `Custom instructions are not supported for ticket type "${ticketType}".`, 
      ephemeral: true,
    });
    return;
  }

  if (!configEntry) {
    if (!allowedTypes.includes(ticketType)) {
      await interaction.reply({ 
        content: `Custom instructions are not supported for ticket type "${ticketType}".`, 
        ephemeral: true,
      });
      return;
    }
    configEntry = await prisma.ticketConfig.create({
      data: {
        ticketType,
        allowCustomInstructions: true,
        useCustomInstructions: false,
        instructions: '',
      }
    });
  }

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
