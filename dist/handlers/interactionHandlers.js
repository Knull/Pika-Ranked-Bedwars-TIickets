import { handleUniversalTicketModal } from '../modals/universalTicketModal.js';
import { createTicketChannel } from './ticketHandlers.js';
export async function registerInteractions(client, interaction) {
    if (interaction.isButton()) {
        const { handleButton } = await import('./buttonHandler.js');
        await handleButton(interaction, client);
    }
    else if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('universal_ticket_modal_')) {
            const { ticketType, title, description } = handleUniversalTicketModal(interaction);
            await createTicketChannel(interaction, capitalize(ticketType), { title, description });
        }
        else if (interaction.customId === 'appeal_alt_modal') {
            const { handleAppealAltModal } = await import('../modals/appealAltModal.js');
            await handleAppealAltModal(interaction);
        }
    }
    else if (interaction.isCommand()) {
        const { handleCommand } = await import('../commands/commandHandler.js');
        await handleCommand(interaction, client);
    }
    else if (interaction.isStringSelectMenu()) {
        // Handle dropdown interactions for appeals.
        if (interaction.customId === 'appeal_initial') {
            const appealDropdown = await import('../dropdowns/appealDropdown.js');
            await appealDropdown.showBanTypeDropdown(interaction);
        }
    }
}
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
