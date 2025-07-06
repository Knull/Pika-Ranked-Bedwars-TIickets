// src/handlers/createTicketHandlers.ts
import { showUniversalTicketModal } from '../modals/universalTicketModal.js';
export async function handleCreateGeneralTicket(interaction, client) {
    // For general tickets, simply show the universal ticket modal.
    await showUniversalTicketModal(interaction, 'General');
}
