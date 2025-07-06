import { handleDeleteTicketManual } from '../handlers/ticketHandlers.js';
export async function handleDeleteTicketModal(interaction) {
    const reason = interaction.fields.getTextInputValue('reason');
    await handleDeleteTicketManual(interaction, reason, interaction.client);
}
