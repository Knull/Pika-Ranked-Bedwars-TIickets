import { ModalSubmitInteraction } from 'discord.js';
import { handleAppealAltModal } from '../modals/appealAltModal.js';
import { handleUniversalTicketModal } from '../modals/universalTicketModal.js';
import { createTicketChannel } from '../handlers/ticketHandlers.js';
import { handleAppealReasonModal, handleBanAppealModal } from '../modals/appealReasonModal.js';
import winston from 'winston';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

export const modalRegistry: { [key: string]: (interaction: ModalSubmitInteraction) => Promise<void> } = {
  // Handles alt appeal modal submissions (custom ID should be "appeal_alt_modal")
  'appeal_alt_modal': async (interaction: ModalSubmitInteraction) => {
    logger.info(`Modal submitted: ${interaction.customId}`);
    await handleAppealAltModal(interaction);
  },
  // Handles universal ticket modals (custom IDs like "universal_ticket_modal_general")
  'universal_ticket_modal': async (interaction: ModalSubmitInteraction) => {
    logger.info(`Modal submitted: ${interaction.customId}`);
    const { ticketType, title, description } = handleUniversalTicketModal(interaction);
    await createTicketChannel(interaction, capitalize(ticketType), { title, description });
  },
  // Handles mute/strike appeal modals (custom IDs like "appeal_reason_modal_appeal_mute" or "..._appeal_strike")
  'appeal_reason_modal': async (interaction: ModalSubmitInteraction) => {
    logger.info(`Modal submitted: ${interaction.customId}`);
    await handleAppealReasonModal(interaction);
  },
  // Handles ban appeal modals (custom IDs like "appeal_ban_modal_screenshare_appeal" or "..._strike_ban")
  'appeal_ban_modal': async (interaction: ModalSubmitInteraction) => {
    logger.info(`Modal submitted: ${interaction.customId}`);
    await handleBanAppealModal(interaction);
  }
};

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
