import { ButtonInteraction, Client } from 'discord.js';
import { handleCloseTicket, promptReason } from '../handlers/ticketHandlers.js';
import { handleCreateGeneralTicket } from '../handlers/createTicketHandlers.js';

export type ButtonHandler = (interaction: ButtonInteraction, client: Client) => Promise<void>;

export const buttonRegistry: { [key: string]: ButtonHandler } = {
  // General ticket creation button
  'create_general': handleCreateGeneralTicket,
  
  // Appeal ticket button: show the initial appeal dropdown
  'create_appeal': async (interaction, client) => {
    const { showInitialAppealDropdown } = await import('../dropdowns/appealDropdown.js');
    await showInitialAppealDropdown(interaction);
  },
  
  // Close ticket button
  'close_ticket': handleCloseTicket,
  
  // Claim ticket button (prompts for a reason)
  'claim_ticket': async (interaction, client) => {
    await promptReason(client, interaction, 'claim_ticket');
  }
  
  // Add other button mappings as needed…
};
