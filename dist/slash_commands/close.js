import { SlashCommandBuilder } from 'discord.js';
import { getTicketMode, TicketMode } from '../utils/ticketModeSettings.js';
import { handleCloseCommand } from '../handlers/ticketHandlers.js';
import { handleCloseThreadCommand } from '../handlers/threadTicketHandlers.js';
const data = new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the ticket (works for both channel-based and thread-based tickets)');
async function execute(interaction) {
    try {
        // Choose the correct handler based on the ticket mode.
        if (getTicketMode() === TicketMode.THREAD_BASED) {
            await handleCloseThreadCommand(interaction);
        }
        else {
            await handleCloseCommand(interaction);
        }
    }
    catch (error) {
        console.error('Error executing close command:', error);
        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({ content: 'An error occurred while closing the ticket.', ephemeral: true });
        }
        else {
            await interaction.followUp({ content: 'An error occurred while closing the ticket.', ephemeral: true });
        }
    }
}
export default { data, execute };
