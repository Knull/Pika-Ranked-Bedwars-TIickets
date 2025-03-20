import cron from 'node-cron';
import prisma from '../utils/database.js';
import { TextChannel, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { getCategoryId } from '../utils/discordUtils.js';
export function startAutoCloseManager(client) {
    // Run every 15 seconds (adjust schedule as desired)
    cron.schedule('*/15 * * * * *', async () => {
        const now = new Date();
        const tickets = await prisma.ticket.findMany({ where: { status: 'open' } });
        for (const ticket of tickets) {
            const channel = await client.channels.fetch(ticket.channelId);
            if (!channel || !(channel instanceof TextChannel))
                continue;
            // Use ticket.lastMessageAt if available (i.e. if the creator has sent a message); otherwise, use createdAt.
            const lastActivity = ticket.lastMessageAt ? new Date(ticket.lastMessageAt) : new Date(ticket.createdAt);
            const diff = now.getTime() - lastActivity.getTime();
            // 15-minute auto-close applies only if the creator has never sent a message.
            if (!ticket.lastMessageAt && diff >= 15 * 60 * 1000) {
                const autoCloseEmbed = new EmbedBuilder()
                    .setColor(0xffff00)
                    .setDescription(`> This ticket was closed automatically as <@${ticket.userId}> did not send a message for **15 Minutes**.`);
                const autoCloseRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete').setStyle(ButtonStyle.Secondary).setEmoji('⏳'), new ButtonBuilder().setCustomId('reopen_ticket').setLabel('Reopen').setStyle(ButtonStyle.Secondary).setEmoji('🔄'));
                await channel.send({
                    embeds: [autoCloseEmbed],
                    components: [autoCloseRow.toJSON()]
                });
                // Call your auto close function here…
                await closeTicketAuto(ticket, channel, 'Ticket closed due to no initial message.');
                continue;
            }
            // 24-hour inactivity auto-close applies only if the creator has sent at least one message.
            if (ticket.lastMessageAt && diff >= 24 * 60 * 60 * 1000) {
                const autoCloseEmbed = new EmbedBuilder()
                    .setColor(0xffff00)
                    .setDescription(`> This ticket was closed automatically as <@${ticket.userId}> did not send a message for **24 Hours**.`);
                const autoCloseRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete').setStyle(ButtonStyle.Secondary).setEmoji('⏳'), new ButtonBuilder().setCustomId('reopen_ticket').setLabel('Reopen').setStyle(ButtonStyle.Secondary).setEmoji('🔄'));
                await channel.send({
                    embeds: [autoCloseEmbed],
                    components: [autoCloseRow.toJSON()]
                });
                await closeTicketAuto(ticket, channel, 'Ticket closed due to inactivity.');
                continue;
            }
            // Optionally, you can add warnings before auto-close.
        }
    });
}
async function closeTicketAuto(ticket, channel, reason) {
    try {
        const parentCategoryId = getCategoryId(ticket.ticketType, true);
        if (parentCategoryId)
            await channel.setParent(parentCategoryId, { lockPermissions: false });
        await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'closed' } });
    }
    catch (error) {
        console.error('Error auto-closing ticket:', error);
    }
}
