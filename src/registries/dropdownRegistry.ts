import { StringSelectMenuInteraction } from 'discord.js';
import { showBanTypeDropdown } from '../dropdowns/appealDropdown.js';
import { showAppealReasonModal, showBanAppealModal } from '../modals/appealReasonModal.js';
import { showAppealAltModal } from '../modals/appealAltModal.js'; // Make sure to import showAppealAltModal, not handleAppealAltModal
import winston from 'winston';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

export const DropdownHandlerRegistry: { [key: string]: (interaction: StringSelectMenuInteraction) => Promise<void> } = {
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
      //
      //  FIX: We call showAppealAltModal(...) to show the modal
      //  for the user to fill out, rather than handleAppealAltModal.
      //
      await showAppealAltModal(interaction);
    } else if (selected === 'screenshare_appeal' || selected === 'strike_ban') {
      await showBanAppealModal(interaction, selected as 'screenshare_appeal' | 'strike_ban');
    } else {
      await interaction.update({ content: "Invalid selection.", components: [] });
    }
  }
};
