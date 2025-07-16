// src/handlers/createTicketHandlers.ts
import { showUniversalTicketModal } from '../modals/universalTicketModal.js';

export async function handleCreateGeneralTicket(interaction: any, client: any): Promise<void> {
  await showUniversalTicketModal(interaction, 'General');
}
