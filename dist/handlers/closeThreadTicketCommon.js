// closeThreadTicketCommon.ts
import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import prisma from '../utils/database.js';
import config from '../config/config.js';
export async function closeThreadTicketCommon(ticket, thread, reason) {
    try {
        // Lock the thread.
        await thread.setLocked(true, reason);
        // Update thread name (if non‑priority) from green (🟢) to red (🔴).
        if (thread.name.startsWith('🟢')) {
            const newName = '🔴' + thread.name.slice(2);
            await thread.setName(newName);
        }
        // (Since auto‑close has no "closer", we skip removing a user.)
        // If an outside announcement message exists, update its status.
        if (ticket.outsideMessageId) {
            const baseChannel = await thread.guild.channels.fetch(config.ticketsChannelId2);
            if (baseChannel && baseChannel.isTextBased()) {
                const textChannel = baseChannel;
                try {
                    const outsideMsg = await textChannel.messages.fetch(ticket.outsideMessageId);
                    const newContent = outsideMsg.content.replace(/Status:\s*[^\n]+/, "Status: 🔴 Closed");
                    await outsideMsg.edit({ content: newContent });
                }
                catch (err) {
                    console.error("Error updating outside message:", err);
                }
            }
        }
        // Update the ticket record: mark closed and store transcript URL.
        await prisma.ticket.updateMany({
            where: { channelId: thread.id },
            data: { status: 'closed', transcriptUrl: thread.url }
        });
        // Build log embed.
        let ticketCreator = null;
        try {
            ticketCreator = await thread.guild.members.fetch(ticket.userId);
        }
        catch (err) {
            console.error("Error fetching ticket creator:", err);
        }
        const nowTs = Math.floor(Date.now() / 1000);
        const transcriptUrl = thread.url;
        const transcriptChannelId = ticket.ticketType === 'General'
            ? config.transcriptChannel1
            : config.transcriptChannel2;
        const logChannel = await thread.guild.channels.fetch(transcriptChannelId);
        const logEmbed = new EmbedBuilder()
            .setAuthor({
            name: `${ticket.ticketNumber} | ${ticketCreator ? ticketCreator.user.username : ticket.userId}`,
            iconURL: thread.guild.iconURL() || ''
        })
            .setTitle(ticket.ticketType)
            .setDescription(`> Ticket Claimed ➤ <t:${nowTs}:F>\n` +
            `> Claimed By ➤ <@${ticket.userId}>\n` +
            `> Available ➤ ${transcriptUrl}`)
            .setTimestamp();
        const advancedButton = new ButtonBuilder()
            .setCustomId(`advanced_ticketLog_${ticket.id}`)
            .setLabel('Advanced')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⚙️');
        const accessTicketButton = new ButtonBuilder()
            .setLabel('Access Ticket')
            .setStyle(ButtonStyle.Link)
            .setURL(transcriptUrl);
        const logRow = new ActionRowBuilder().addComponents(advancedButton, accessTicketButton);
        let logLink = undefined;
        if (logChannel) {
            const sent = await logChannel.send({ embeds: [logEmbed], components: [logRow] });
            logLink = `https://discord.com/channels/${thread.guild.id}/${logChannel.id}/${sent.id}`;
        }
        if (logLink) {
            await prisma.ticket.update({ where: { id: ticket.id }, data: { logMessageUrl: logLink } });
        }
        // DM the ticket creator with the same log embed.
        if (ticketCreator) {
            try {
                await ticketCreator.send({ embeds: [logEmbed], components: [logRow] });
            }
            catch (dmError) {
                console.error("Error sending DM to ticket creator:", dmError);
            }
        }
    }
    catch (error) {
        console.error('Error in auto-closing thread ticket:', error);
    }
}
