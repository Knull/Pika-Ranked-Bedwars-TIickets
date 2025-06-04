import cron from 'node-cron';
import prisma from '../utils/database.js';
import { Client, TextChannel, ThreadChannel, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import config from '../config/config.js';
import { getCategoryId } from '../utils/discordUtils.js';

export function startAutoCloseManager(client: Client) {
  cron.schedule('*/15 * * * * *', async () => {
    const now = new Date();
    const tickets = await prisma.ticket.findMany({
      where: { status: { in: ['open', 'reopened'] } }
    });
    for (const ticket of tickets) {
      const channel = await client.channels.fetch(ticket.channelId);
      if (!channel || (!(channel instanceof TextChannel) && !(channel instanceof ThreadChannel))) continue;
      const lastActivity = ticket.lastMessageAt ? new Date(ticket.lastMessageAt) : new Date(ticket.createdAt);
      const diff = now.getTime() - lastActivity.getTime();
      
      if (channel instanceof ThreadChannel) {
        if (ticket.lastMessageAt && diff >= 24 * 60 * 60 * 1000) {
          const autoCloseEmbed = new EmbedBuilder()
            .setColor(0xffff00)
            .setDescription(`> This ticket was closed automatically as <@${ticket.userId}> did not send a message for **24 Hours**.`);
          const autoCloseRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('reopen_thread')
              .setLabel('Reopen')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🔓')
          );
          await channel.send({ embeds: [autoCloseEmbed], components: [autoCloseRow] });
          await closeTicketAuto(ticket, channel);
          continue;
        }
      } else if (channel instanceof TextChannel) {
        if (ticket.lastMessageAt && diff >= 24 * 60 * 60 * 1000) {
          const autoCloseEmbed = new EmbedBuilder()
            .setColor(0xffff00)
            .setDescription(`> This ticket was closed automatically as <@${ticket.userId}> did not send a message for **24 Hours**.`);
          const autoCloseRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('delete_ticket_auto')
              .setLabel('Delete')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('⏳'),
            new ButtonBuilder()
              .setCustomId('reopen_ticket')
              .setLabel('Reopen')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🔓')
          );
          await channel.send({ embeds: [autoCloseEmbed], components: [autoCloseRow] });
          await closeTicketAuto(ticket, channel);
          continue;
        }
      }
    }
  });
}

async function closeTicketAuto(ticket: any, channel: TextChannel | ThreadChannel) {
  try {
    // For TextChannels, update the parent category if available.
    const parentCategoryId = getCategoryId(ticket.ticketType, true);
    if (parentCategoryId && 'setParent' in channel && typeof channel.setParent === 'function') {
      await channel.setParent(parentCategoryId, { lockPermissions: false });
    }
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'closed' } });
  } catch (error) {
    console.error('Error auto-closing ticket:', error);
  }
}
