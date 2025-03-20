import { ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import prisma from '../utils/database.js';

export async function handleTicketConfigPermissions(interaction: ChatInputCommandInteraction): Promise<void> {
  const ticketType = interaction.options.getString('tickettype', true);

  if (!interaction.guild) {
    await interaction.reply({ content: 'Guild not found', ephemeral: true });
    return;
  }

  // Fetch all roles in the guild.
  const roles = await interaction.guild.roles.fetch();
  const roleOptions = roles.map(role => ({
    label: role.name,
    value: role.id,
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`config_permissions_${ticketType}`)
    .setPlaceholder(`Select roles for ${ticketType} tickets`)
    .addOptions(roleOptions);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
  await interaction.reply({ content: `Configure permissions for ${ticketType} tickets:`, components: [row], ephemeral: true });
}
