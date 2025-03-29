import { 
  StringSelectMenuInteraction, 
  RoleSelectMenuInteraction, 
  ButtonStyle, 
  ButtonBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  Role 
} from 'discord.js';
import { showBanTypeDropdown } from '../dropdowns/appealDropdown.js';
import { showAppealReasonModal, showBanAppealModal } from '../modals/appealReasonModal.js';
import { showAppealAltModal } from '../modals/appealAltModal.js';
import winston from 'winston';
import { RoleSelectCache } from '../utils/roleSelectCache.js'

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

// Handlers for string select menus
export const StringSelectHandlers: { [key: string]: (interaction: StringSelectMenuInteraction) => Promise<void> } = {
  'appeal_initial': async (interaction: StringSelectMenuInteraction) => {
    logger.info(`Dropdown selected: ${interaction.customId}`);
    const selected = interaction.values[0];
    if (selected === 'appeal_ban') {
      await showBanTypeDropdown(interaction);
    } else if (selected === 'appeal_strike' || selected === 'appeal_mute') {
      await showAppealReasonModal(interaction, selected as 'appeal_mute' | 'appeal_strike');
    } else {
      await interaction.update({ content: "Invalid selection.", components: [] });
    }
  },
  'ban_type': async (interaction: StringSelectMenuInteraction) => {
    logger.info(`Dropdown selected: ${interaction.customId}`);
    const selected = interaction.values[0];
    if (selected === 'banned_alt') {
      await showAppealAltModal(interaction);
    } else if (selected === 'screenshare_appeal' || selected === 'strike_ban') {
      await showBanAppealModal(interaction, selected as 'screenshare_appeal' | 'strike_ban');
    } else {
      await interaction.update({ content: "Invalid selection.", components: [] });
    }
  },
};

// Handlers for role select menus
export const RoleSelectHandlers: { [key: string]: (interaction: RoleSelectMenuInteraction) => Promise<void> } = {
  'config_permissions_': async (interaction: RoleSelectMenuInteraction) => {
    const ticketType = interaction.customId.replace('config_permissions_', '')
    const selectedRoleIds = interaction.values
    const cacheKey = `${interaction.user.id}_${ticketType}`
    RoleSelectCache.set(cacheKey, selectedRoleIds)
    const rolesMap = await interaction.guild?.roles.fetch()
    const rolesArray = rolesMap ? Array.from(rolesMap.values()) : []
    const selectedRoles = rolesArray.filter(role => selectedRoleIds.includes(role.id))
    const roleNames = selectedRoles.map(role => role.name).join(', ') || 'None'
    const updatedEmbed = new EmbedBuilder()
      .setTitle("Permissions Config")
      .setDescription(`- Ticket Type: \`${ticketType}\`\n> Use the dropdown below to adjust permissions.\n\n\`\`\`Roles Selected:\n${roleNames}\n\`\`\``)
    const confirmButton = new ButtonBuilder()
      .setCustomId(`confirm_permissions_${ticketType}`)
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success)
    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_permissions_${ticketType}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton)
    await interaction.update({ embeds: [updatedEmbed], components: [buttonRow] })
  },
}
