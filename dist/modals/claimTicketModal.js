import { handleClaimTicket } from '../handlers/ticketHandlers.js';
export async function handleClaimTicketModal(interaction) {
    const reason = interaction.fields.getTextInputValue('reason');
    await handleClaimTicket(interaction, reason, interaction.client);
}
