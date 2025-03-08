import prisma from '../utils/database.js';
import { handleCloseTicket, promptReason } from '../handlers/ticketHandlers.js';
import { handleCreateGeneralTicket } from '../handlers/createTicketHandlers.js';
import { createTicketChannel } from '../handlers/ticketHandlers.js';
import { showInitialAppealDropdown } from '../dropdowns/appealDropdown.js';
import winston from 'winston';
const logger = winston.createLogger({
    transports: [new winston.transports.Console()]
});
async function checkTicketLimit(interaction) {
    const openTickets = await prisma.ticket.findMany({ where: { userId: interaction.user.id, status: 'open' } });
    if (openTickets.length >= 2) {
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({
                content: 'You already have 2 open tickets. Please continue in one of your existing ticket channels.',
                ephemeral: true
            });
        }
        else {
            await interaction.reply({
                content: 'You already have 2 open tickets. Please continue in one of your existing ticket channels.',
                ephemeral: true
            });
        }
        return true;
    }
    return false;
}
export const ButtonHandlerRegistry = {
    'create_general': async (interaction, client) => {
        logger.info(`Handling create_general button`);
        if (await checkTicketLimit(interaction))
            return;
        await handleCreateGeneralTicket(interaction, client);
    },
    'create_appeal': async (interaction, client) => {
        logger.info('Handling create_appeal button');
        // 1. Immediately defer so we have more than 3 seconds
        try {
            // Use flags: 64 for ephemeral
            await interaction.deferReply({ flags: 64 });
        }
        catch (err) {
            console.error('Error deferring create_appeal:', err);
            return;
        }
        // 2. Ticket-limit check
        try {
            const openTickets = await prisma.ticket.findMany({
                where: { userId: interaction.user.id, status: 'open' }
            });
            if (openTickets.length >= 2) {
                await interaction.editReply({
                    content: 'You already have 2 open tickets. Please continue in one of your existing ticket channels.'
                });
                return;
            }
        }
        catch (err) {
            console.error('Error checking ticket limit for appeals:', err);
            // Fallback to avoid crash
            try {
                await interaction.editReply({
                    content: 'An error occurred checking your ticket limit. Please try again later.'
                });
            }
            catch (err2) {
                console.error('Error editing limit-check reply for appeals:', err2);
            }
            return;
        }
        // 3. Show the initial appeal dropdown
        try {
            // Instead of showInitialAppealDropdown(interaction.reply),
            // we now do it with interaction.editReply since the interaction is deferred
            // We'll pass a flag to the function so it uses editReply
            await showInitialAppealDropdown(interaction, /* useEditReply= */ true);
        }
        catch (err) {
            console.error('Error showing initial appeal dropdown:', err);
            try {
                await interaction.editReply({
                    content: 'An error occurred while showing the appeal menu. Please try again later.'
                });
            }
            catch (err2) {
                console.error('Error editing final appeal reply:', err2);
            }
        }
    },
    'create_store': async (interaction, client) => {
        logger.info(`Handling create_store button`);
        // Immediately acknowledge so we have more time
        try {
            // If you want ephemeral, use flags: 64
            await interaction.deferReply({ flags: 64 });
        }
        catch (err) {
            console.error('Error deferring store ticket:', err);
            // If the token is already invalid, we can't proceed
            return;
        }
        // Now do the ticket-limit check
        const openTickets = await prisma.ticket.findMany({ where: { userId: interaction.user.id, status: 'open' } });
        if (openTickets.length >= 2) {
            try {
                // Since we already deferred, we must use editReply or followUp
                await interaction.editReply({
                    content: 'You already have 2 open tickets. Please continue in one of your existing ticket channels.'
                });
            }
            catch (e) {
                console.error('Error replying ticket limit for store:', e);
            }
            return;
        }
        // create the store ticket
        try {
            const data = {
                title: 'Store Purchase',
                description: "Once you're done selecting a product, please describe what payment method you would like to use for the purchase. Feel free to ask any questions!"
            };
            const ticketChannel = await createTicketChannel(interaction, 'Store', data, /* shouldDefer= */ false);
            // Then confirm success
            await interaction.editReply({
                content: `Your ticket has been opened. Head over to <#${ticketChannel.id}> to continue.`
            });
        }
        catch (e) {
            console.error('Error creating store ticket:', e);
            // The token might be expired, but we can attempt this
            try {
                await interaction.editReply({ content: 'Failed to create store ticket. Please try again later.' });
            }
            catch (err) {
                console.error('Error editing store ticket reply:', err);
            }
        }
    },
    'create_staff_report': async (interaction, client) => {
        logger.info(`Handling create_staff_report button`);
        if (await checkTicketLimit(interaction))
            return;
        await createTicketChannel(interaction, 'Staff Report', { title: 'Staff Report Ticket', description: 'Please provide details about your staff report.' });
    },
    'create_partnership': async (interaction, client) => {
        logger.info(`Handling create_partnership button`);
        if (await checkTicketLimit(interaction))
            return;
        await createTicketChannel(interaction, 'Partnership', { title: 'Partnership Ticket', description: 'Please provide your partnership application details.' });
    },
    'close_ticket': async (interaction, client) => {
        logger.info(`Button pressed: ${interaction.customId}`);
        await handleCloseTicket(interaction);
    },
    'claim_ticket': async (interaction, client) => {
        logger.info(`Button pressed: ${interaction.customId}`);
        await promptReason(client, interaction, 'claim_ticket');
    },
    'reopen_ticket': async (interaction, client) => {
        logger.info(`Button pressed: ${interaction.customId}`);
        await interaction.reply({ content: 'Reopen functionality not yet implemented.', ephemeral: true });
    },
    'delete_ticket': async (interaction, client) => {
        logger.info(`Button pressed: ${interaction.customId}`);
        await interaction.reply({ content: 'Delete functionality not yet implemented.', ephemeral: true });
    }
};
