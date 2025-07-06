import { SlashCommandBuilder } from 'discord.js';
import { getTicketMode, TicketMode } from '../utils/ticketModeSettings.js';
import { handleClaimCommand } from '../handlers/ticketHandlers.js';
const data = new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim the ticket with a provided reason (only available for channel-based tickets)')
    .addStringOption(option => option
    .setName('reason')
    .setDescription('The reason for claiming the ticket')
    .setRequired(true));
async function execute(interaction) {
    // Check if the current ticket system uses threads.
    if (getTicketMode() === TicketMode.THREAD_BASED) {
        await interaction.reply({
            content: 'Current Ticketing System is set to threads, so claim is not available.',
            ephemeral: true
        });
        return;
    }
    // Retrieve the reason from the options.
    const reason = interaction.options.getString('reason', true);
    try {
        // Call the claim handler.
        // Note: The handler itself handles deferring the reply,
        // checks for staff permission (using config.staffRoleId), and deletes the ticket channel.
        await handleClaimCommand(interaction, reason, interaction.client);
    }
    catch (error) {
        console.error('Error executing claim command:', error);
        // If the handler already deferred/replied, use followUp; otherwise reply.
        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({ content: 'An error occurred while claiming the ticket.', ephemeral: true });
        }
        else {
            await interaction.followUp({ content: 'An error occurred while claiming the ticket.', ephemeral: true });
        }
    }
}
export default { data, execute };
