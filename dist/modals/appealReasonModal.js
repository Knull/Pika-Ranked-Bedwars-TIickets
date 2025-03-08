import { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } from 'discord.js';
import { createTicketChannel } from '../handlers/ticketHandlers.js';
/**
 * Shows the modal for appeal reasons for mute or strike appeals.
 */
export function showAppealReasonModal(interaction, appealType) {
    const modal = new ModalBuilder()
        .setCustomId(`appeal_reason_modal_${appealType}`)
        .setTitle(appealType === 'appeal_mute' ? 'Mute Appeal' : 'Strike Appeal');
    // Use a short label within 45 characters:
    const label = appealType === 'appeal_mute'
        ? 'Why should you be unmuted?'
        : 'Why should we revert your strike?';
    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel(label)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    interaction.showModal(modal);
}
/**
 * Shows the modal for ban appeals.
 */
export function showBanAppealModal(interaction, banType) {
    const modal = new ModalBuilder()
        .setCustomId(`appeal_ban_modal_${banType}`)
        .setTitle('Ban Appeal');
    const label = 'Why should you be unbanned?)';
    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel(label)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    interaction.showModal(modal);
}
/**
 * Handler for the Mute/Strike Appeal modal submission.
 */
export async function handleAppealReasonModal(interaction) {
    const customId = interaction.customId; // e.g. "appeal_reason_modal_appeal_mute"
    const appealType = customId.split('_').slice(-2).join('_'); // yields "appeal_mute" or "appeal_strike"
    const reason = interaction.fields.getTextInputValue('reason').trim();
    if (reason.split(/\s+/).length < 10) {
        await interaction.reply({ content: 'Please provide at least 10 words.', ephemeral: true });
        return;
    }
    const ticketType = appealType === 'appeal_mute' ? 'Mute Appeal' : 'Strike Appeal';
    // Create the ticket channel using the provided reason in a code block.
    await createTicketChannel(interaction, ticketType, { title: ticketType, description: reason });
}
/**
 * Handler for the Ban Appeal modal submission.
 */
export async function handleBanAppealModal(interaction) {
    const customId = interaction.customId; // e.g. "appeal_ban_modal_screenshare_appeal"
    const banType = customId.replace('appeal_ban_modal_', '');
    const reason = interaction.fields.getTextInputValue('reason').trim();
    if (reason.split(/\s+/).length < 10) {
        await interaction.reply({ content: 'Please provide at least 10 words.', ephemeral: true });
        return;
    }
    // For both screenshare and strike ban appeals, use the same ticket type.
    await createTicketChannel(interaction, 'Ban Appeal', { title: 'Ban Appeal', description: reason, banType });
}
