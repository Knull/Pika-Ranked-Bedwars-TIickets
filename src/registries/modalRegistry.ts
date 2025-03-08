import { ModalSubmitInteraction } from 'discord.js';
import { handleAppealAltModal } from '../modals/appealAltModal.js';
import { handleUniversalTicketModal } from '../modals/universalTicketModal.js';
import { createTicketChannel } from '../handlers/ticketHandlers.js';

export type ModalHandler = (interaction: ModalSubmitInteraction) => Promise<void>;

export const modalRegistry: { [key: string]: ModalHandler } = {
  // Modal for alt appeals
  'appeal_alt_modal': async (interaction) => {
  // Now `interaction` is a ModalSubmitInteraction
  // so we call handleAppealAltModal:
  await handleAppealAltModal(interaction);
} , 
  // Universal ticket modal – using a prefix match.
  'universal_ticket_modal': async (interaction) => {
    const { ticketType, title, description } = handleUniversalTicketModal(interaction);
    await createTicketChannel(interaction, capitalize(ticketType), { title, description });
  }
};

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
