import { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } from 'discord.js';
export function showUniversalTicketModal(interaction, ticketType) {
    const modal = new ModalBuilder()
        .setCustomId(`universal_ticket_modal_${ticketType.toLowerCase()}`)
        .setTitle(`${ticketType} Ticket`);
    const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Ticket Title')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    const descInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Describe your issue')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(titleInput), new ActionRowBuilder().addComponents(descInput));
    interaction.showModal(modal);
}
export function handleUniversalTicketModal(interaction) {
    const ticketType = interaction.customId.replace('universal_ticket_modal_', '');
    const title = interaction.fields.getTextInputValue('title');
    const description = interaction.fields.getTextInputValue('description');
    return { ticketType, title, description };
}
