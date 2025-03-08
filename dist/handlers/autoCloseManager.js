import cron from 'node-cron';
import prisma from '../utils/database.js';
import { TextChannel, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { getCategoryId } from '../utils/discordUtils.js';
export function startAutoCloseManager(client) {
    // Run every minute.
    cron.schedule('*/15 * * * * *', async () => {
        const now = new Date();
        const tickets = await prisma.ticket.findMany({ where: { status: 'open' } });
        for (const ticket of tickets) {
            const channel = await client.channels.fetch(ticket.channelId);
            if (!channel || !(channel instanceof TextChannel))
                continue;
            const lastActivity = ticket.lastMessageAt ? new Date(ticket.lastMessageAt) : new Date(ticket.createdAt);
            const diff = now.getTime() - lastActivity.getTime();
            // 15-minute auto-close if no initial message.
            if (!ticket.lastMessageAt && diff >= 15 * 60 * 1000) {
                const autoCloseEmbed = new EmbedBuilder()
                    .setColor(0xffff00)
                    .setDescription(`> This ticket was closed automatically as <@${ticket.userId}> did not send a message for **15 Minutes**.`);
                const autoCloseRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete').setStyle(ButtonStyle.Secondary).setEmoji('⛔'), new ButtonBuilder().setCustomId('reopen_ticket').setLabel('Reopen').setStyle(ButtonStyle.Secondary).setEmoji('🔓'));
                await channel.send({
                    embeds: [autoCloseEmbed],
                    components: [autoCloseRow.toJSON()]
                });
                await closeTicketAuto(ticket, channel, 'Ticket closed due to no initial message.');
                continue;
            }
            // 24-hour inactivity auto-close.
            if (diff >= 24 * 60 * 60 * 1000) {
                const autoCloseEmbed = new EmbedBuilder()
                    .setColor(0xffff00)
                    .setDescription(`> This ticket was closed automatically as <@${ticket.userId}> did not send a message for **24 Hours**.`);
                const autoCloseRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete').setStyle(ButtonStyle.Secondary).setEmoji('⛔'), new ButtonBuilder().setCustomId('reopen_ticket').setLabel('Reopen').setStyle(ButtonStyle.Secondary).setEmoji('🔓'));
                await channel.send({
                    embeds: [autoCloseEmbed],
                    components: [autoCloseRow.toJSON()]
                });
                await closeTicketAuto(ticket, channel, 'Ticket closed due to inactivity.');
                continue;
            }
            // Warning notifications can remain as before...
        }
    });
}
async function closeTicketAuto(ticket, channel, reason) {
    try {
        const parentCategoryId = getCategoryId(ticket.ticketType, true);
        if (parentCategoryId)
            await channel.setParent(parentCategoryId, { lockPermissions: false });
        await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'closed' } });
        // Optionally, delete channel after sending confirmation.
    }
    catch (error) {
        console.error('Error auto-closing ticket:', error);
    }
}
