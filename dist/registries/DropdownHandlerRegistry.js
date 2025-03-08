import { showBanTypeDropdown } from '../dropdowns/appealDropdown.js';
import { showAppealReasonModal, showBanAppealModal } from '../modals/appealReasonModal.js';
import { showAppealAltModal } from '../modals/appealAltModal.js';
import winston from 'winston';
const logger = winston.createLogger({
    transports: [new winston.transports.Console()]
});
export const DropdownHandlerRegistry = {
    'appeal_initial': async (interaction) => {
        logger.info(`Dropdown selected: ${interaction.customId}`);
        const selected = interaction.values[0];
        if (selected === 'appeal_ban') {
            await showBanTypeDropdown(interaction);
        }
        else if (selected === 'appeal_strike' || selected === 'appeal_mute') {
            await showAppealReasonModal(interaction, selected);
        }
        else {
            await interaction.update({ content: "Invalid selection.", components: [] });
        }
    },
    'ban_type': async (interaction) => {
        logger.info(`Dropdown selected: ${interaction.customId}`);
        const selected = interaction.values[0];
        if (selected === 'banned_alt') {
            await showAppealAltModal(interaction);
        }
        else if (selected === 'screenshare_appeal' || selected === 'strike_ban') {
            await showBanAppealModal(interaction, selected);
        }
        else {
            await interaction.update({ content: "Invalid selection.", components: [] });
        }
    }
};
