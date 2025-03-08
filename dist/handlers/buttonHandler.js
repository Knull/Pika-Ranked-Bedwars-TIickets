import { showUniversalTicketModal } from '../modals/universalTicketModal.js';
export async function handleButton(interaction, client) {
    const customId = interaction.customId;
    // For appeal tickets, use the appeal-specific dropdown.
    if (customId === 'create_appeal') {
        const appealDropdown = await import('../dropdowns/appealDropdown.js');
        await appealDropdown.showInitialAppealDropdown(interaction);
    }
    // For other ticket types, use the universal ticket modal.
    else if (customId.startsWith('create_')) {
        const ticketType = customId.replace('create_', '');
        await showUniversalTicketModal(interaction, capitalize(ticketType));
    }
    else if (customId === 'close_ticket') {
        const { handleCloseTicket } = await import('./ticketHandlers.js');
        await handleCloseTicket(interaction);
    }
    else if (customId === 'claim_ticket') {
        const { promptReason, handleClaimTicket } = await import('./ticketHandlers.js');
        await promptReason(client, interaction, 'claim_ticket');
    }
    else if (customId === 'player_info') {
        const { handlePlayerInfo } = await import('./ticketHandlers.js');
        await handlePlayerInfo(interaction, client);
    }
}
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
