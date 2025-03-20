import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel, TextInputBuilder, ModalBuilder, TextInputStyle, PermissionsBitField, OverwriteType } from 'discord.js';
import config from '../config/config.js';
import prisma from '../utils/database.js';
import { getCategoryId, getPermissionOverwrites } from '../utils/discordUtils.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import axios from 'axios';
const execAsync = promisify(exec);
export async function setupTicketSystem(client) {
    try {
        const channelFetched = await client.channels.fetch(config.ticketsChannelId);
        if (!channelFetched || !channelFetched.isTextBased()) {
            console.error('Failed to fetch the tickets channel.');
            return;
        }
        const ticketsChannel = channelFetched;
        const messages = await ticketsChannel.messages.fetch({ limit: 10 });
        const setupMessageExists = messages.some(msg => msg.author.id === client.user?.id &&
            msg.embeds.length > 0 &&
            msg.embeds[0].title === 'Need Assistance?');
        if (!setupMessageExists) {
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Need Assistance?')
                .setDescription('- **<:general:1298227239069945888> General ➤** Need help? Get assistance here.\n' +
                '- **⚖️ Appeal ➤** Appeal a ban or mute here.\n' +
                '- **🛒 Store ➤** Get assistance with store-related purchases.\n' +
                '- **<a:partnership:1298227428866527285> Partnership ➤** Apply to be a server partner here.');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('create_general').setStyle(ButtonStyle.Secondary).setEmoji('<:general:1298227239069945888>'), new ButtonBuilder().setCustomId('create_appeal').setStyle(ButtonStyle.Secondary).setEmoji('⚖️'), new ButtonBuilder().setCustomId('create_store').setStyle(ButtonStyle.Secondary).setEmoji('🛒'), new ButtonBuilder().setCustomId('create_partnership').setStyle(ButtonStyle.Secondary).setEmoji('<a:partnership:1298227428866527285>'));
            await ticketsChannel.send({ embeds: [embed], components: [row] });
            console.log('Ticket system setup message sent.');
        }
        else {
            console.log('Ticket system setup message already exists.');
        }
    }
    catch (error) {
        console.error('Error in ticketing system setup:', error);
    }
}
export async function createTicketChannel(interaction, ticketType, data, shouldDefer = true) {
    const { guild, user } = interaction;
    if (!guild) {
        if (shouldDefer && !interaction.deferred) {
            try {
                await interaction.reply({ content: 'Guild not found', ephemeral: true });
            }
            catch (e) { }
        }
        throw new Error('Guild not found');
    }
    // Always defer if not already deferred.
    if (shouldDefer && !interaction.deferred) {
        await interaction.deferReply({ flags: 64 });
    }
    // Fetch ticket counter settings.
    const settings = await prisma.ticketSettings.findUnique({ where: { id: 1 } });
    let ticketCounter = settings?.ticketCounter || 1;
    const prefix = '┃';
    const username = user.username.split(/[\s\W_]+/)[0] || user.username;
    const ticketChannelName = `${ticketCounter}${prefix}${username}`;
    // Get base permission overwrites.
    let permissionOverwrites = getPermissionOverwrites(guild, user.id, ticketType);
    if (ticketType === 'Ban Appeal' && data.banType === 'screenshare_appeal') {
        permissionOverwrites.push({
            id: config.SSAppealTeamRoleId,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
            type: OverwriteType.Role
        }, {
            id: config.adminRoleId,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
            type: OverwriteType.Role
        });
    }
    // Fetch configuration from the database for this ticket type.
    const configEntry = await prisma.ticketConfig.findUnique({ where: { ticketType } });
    if (configEntry?.permissions && Array.isArray(configEntry.permissions)) {
        permissionOverwrites = configEntry.permissions;
    }
    const parentCategoryId = getCategoryId(ticketType);
    if (!parentCategoryId)
        throw new Error(`Parent category not set for ${ticketType}`);
    const channelCreated = await guild.channels.create({
        name: ticketChannelName,
        type: 0, // GuildText
        parent: parentCategoryId,
        permissionOverwrites,
        topic: `[${ticketType}] Ticket for ${user.username}`
    });
    const ticketChannel = channelCreated;
    // Send a welcome message.
    const welcomeMessage = `Hey <@${user.id}> 👋!\n\`\`\`Please wait patiently for staff to reply. If no one responds, you may ping staff. Thanks!\`\`\``;
    await ticketChannel.send(welcomeMessage);
    // Build the main ticket embed.
    let embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setAuthor({ name: `${ticketType} Ticket`, iconURL: user.displayAvatarURL() });
    // Allowed types for custom instructions in the main embed.
    // For Partnership tickets, we don't append instructions in the main embed.
    const allowedForMain = ['Store', 'Alt Appeal'];
    if (allowedForMain.includes(ticketType)) {
        // Use custom instructions if enabled; otherwise, fall back to a default.
        const defaultInstr = ticketType === 'Store'
            ? "Once you're done selecting a product, please describe your payment method and any questions you have."
            : "Please provide your appeal details.";
        const instructionsToUse = configEntry && configEntry.useCustomInstructions && configEntry.instructions
            ? configEntry.instructions
            : defaultInstr;
        embed.setTitle(ticketType === 'Store' ? 'Store Purchase' : data.title)
            .setDescription(`\`\`\`${data.description}\`\`\`\n\n**Instructions:** ${instructionsToUse}`);
    }
    else if (ticketType === 'Partnership') {
        // For Partnership tickets, the main embed does not include instructions.
        embed.setTitle(data.title)
            .setDescription(`\`\`\`${data.description}\`\`\``);
    }
    else {
        // For all other ticket types, simply use the provided description.
        embed.setTitle(data.title)
            .setDescription(`\`\`\`${data.description}\`\`\``);
    }
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'), new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('<a:check:1256329093679681608>'));
    const ticketMsg = await ticketChannel.send({ embeds: [embed], components: [row] });
    // Send additional embed if ticketType is Partnership.
    if (ticketType === 'Partnership') {
        // Use custom partnership info if enabled; otherwise use a default.
        const defaultPartnershipInfo = `### PRBW is no longer doing free partnerships.\n\n` +
            `Server must be Minecraft related (exceptions can be made, e.g., for performance enhancing softwares).\n` +
            `- **Server must have 1,000+ members. (In this case, we'll do a NoPing4Ping partnership, where you have to ping for our advertisement but we won't)**\n` +
            `- **For a Ping4Ping or a partnership with a smaller server, the prices are given below:**\n` +
            "```arm\n" +
            "1. Simple Ping4Ping partnership, if your server is above 1000 members will cost $15 USD.\n" +
            "2. A Ping4Ping partnership with smaller servers may cost up to $20 USD.\n" +
            "3. A Ping4Ping CAN BE FREE for servers with 1.25x the number of members of PRBW.\n" +
            "4. A simple partnership with no pings for servers of any member count will cost $10 USD.\n" +
            "```";
        const partnershipInfo = configEntry && configEntry.useCustomInstructions && configEntry.instructions
            ? configEntry.instructions
            : defaultPartnershipInfo;
        const partnershipEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setAuthor({
            name: 'Pinned Message',
            iconURL: 'https://cdn.discordapp.com/emojis/1348557777785716756.webp?size=44'
        })
            .setTitle('Partnership Requirements')
            .setDescription(partnershipInfo);
        await ticketChannel.send({ embeds: [partnershipEmbed] });
    }
    // Insert ticket info into the database.
    // For allowed types for main embed, use the final instructions; for Partnership, we use just the description.
    const finalReason = allowedForMain.includes(ticketType)
        ? (configEntry && configEntry.useCustomInstructions && configEntry.instructions
            ? configEntry.instructions
            : (ticketType === 'Store'
                ? "Once you're done selecting a product, please describe your payment method and any questions you have."
                : data.description))
        : data.description;
    await prisma.ticket.create({
        data: {
            ticketNumber: ticketCounter,
            ticketType,
            status: 'open',
            channelId: ticketChannel.id,
            userId: user.id,
            ticketMessageId: ticketMsg.id,
            reason: ticketType === 'Partnership' ? data.description : finalReason
        }
    });
    await prisma.ticketSettings.update({
        where: { id: 1 },
        data: { ticketCounter: ticketCounter + 1 }
    });
    // Edit the deferred reply to confirm ticket creation.
    if (shouldDefer) {
        try {
            await interaction.editReply({ content: `Your ticket has been opened. Head over to <#${ticketChannel.id}> to continue.` });
        }
        catch (e) {
            console.error('Error editing reply:', e);
        }
    }
    return ticketChannel;
}
// ------------------------------------------------------------------
// Update handleCloseTicket to disable original buttons and send new message
export async function handleCloseTicket(interaction) {
    try {
        // Defer the reply to acknowledge the interaction.
        await interaction.deferReply({ ephemeral: true });
        const channel = interaction.channel;
        if (!channel || !(channel instanceof TextChannel)) {
            await interaction.followUp({ content: 'Channel not found or invalid.', ephemeral: true });
            return;
        }
        const ticket = await prisma.ticket.findFirst({ where: { channelId: channel.id } });
        if (!ticket) {
            await interaction.followUp({ content: 'Ticket not found in the database.', ephemeral: true });
            return;
        }
        // Disable the original ticket message buttons.
        if (ticket.ticketMessageId) {
            const originalMsg = await channel.messages.fetch(ticket.ticketMessageId).catch(() => null);
            if (originalMsg) {
                const disabledComponents = originalMsg.components.map(row => ({
                    type: row.type,
                    components: row.components.map(component => {
                        const data = component.toJSON();
                        data.disabled = true;
                        return data;
                    })
                }));
                await originalMsg.edit({ components: disabledComponents });
            }
        }
        // Remove the ticket creator's permissions.
        await channel.permissionOverwrites.edit(ticket.userId, {
            ViewChannel: false,
            SendMessages: false
        });
        // Determine archived category.
        const archivedCategoryId = getCategoryId(ticket.ticketType, true);
        if (!archivedCategoryId) {
            await interaction.followUp({ content: 'Archived category not set for this ticket type.', ephemeral: true });
            return;
        }
        // Move channel to archived category.
        await channel.setParent(archivedCategoryId, { lockPermissions: false });
        // Update ticket status.
        await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'closed' } });
        // Create an embed with no title, only a description with a lock emoji.
        const closeEmbed = new EmbedBuilder()
            .setColor(0xffff00)
            .setDescription(`> 🔒 Ticket closed by <@${interaction.user.id}>`);
        // Create new buttons (both secondary style).
        const closeRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete').setStyle(ButtonStyle.Secondary).setEmoji('⛔'), new ButtonBuilder().setCustomId('reopen_ticket').setLabel('Reopen').setStyle(ButtonStyle.Secondary).setEmoji('🔓'));
        // Send the embed message with the new buttons to the ticket channel.
        await channel.send({ embeds: [closeEmbed], components: [closeRow.toJSON()] });
        // Respond to the interaction.
        await interaction.followUp({ content: 'Ticket has been closed and archived.', ephemeral: true });
    }
    catch (error) {
        console.error('Error closing ticket:', error);
        await interaction.followUp({ content: 'Failed to close ticket.', ephemeral: true });
    }
}
export async function handlePlayerInfo(interaction, client) {
    const ticket = await prisma.ticket.findFirst({ where: { channelId: interaction.channel.id } });
    if (!ticket) {
        if (typeof interaction.reply === 'function') {
            await interaction.reply({ content: 'Ticket not found.', ephemeral: true });
        }
        else {
            await interaction.channel.send({ content: 'Ticket not found.' });
        }
        return;
    }
    const profile = await prisma.playerProfile.findFirst({ where: { discordUserId: ticket.userId } });
    if (!profile) {
        if (typeof interaction.reply === 'function') {
            await interaction.reply({ content: 'Player profile not found.', ephemeral: true });
        }
        else {
            await interaction.channel.send({ content: 'Player profile not found.' });
        }
        return;
    }
    const lastSeenTs = Math.floor(new Date(profile.lastSeen).getTime() / 1000);
    const accountCreatedTs = Math.floor(interaction.user.createdAt.getTime() / 1000);
    const joinDateTs = Math.floor(interaction.member.joinedAt.getTime() / 1000);
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription(`# [🎯 Player Information | ${profile.ign}](https://stats.pika-network.net/player/${profile.ign})\n` +
        `- <a:last_seen:1347936608254427229> **Last Seen:** <t:${lastSeenTs}:R>\n` +
        `> 🎯 **Rank Details:** Level: \` ${profile.rankInfo?.level || 'N/A'} \` <:divider:1289576524550504458> experience: \` ${profile.rankInfo?.experience || 'N/A'} \` <:divider:1289576524550504458> percentage: \` ${profile.rankInfo?.percentage || 'N/A'} \`\n` +
        `- 🕒 **Join Date:** <t:${joinDateTs}:F>\n` +
        `> 📆 **Account Created:** <t:${accountCreatedTs}:R>\n` +
        `- **Clan Name:** ${profile.clanName || 'N/A'}`);
    let friends = profile.friends || [];
    if (friends.length > 5) {
        const mid = Math.ceil(friends.length / 2);
        const friendList1 = friends.slice(0, mid).map((friend, i) => `${i + 1}. ${friend}`).join('\n');
        const friendList2 = friends.slice(mid).map((friend, i) => `${i + 1 + mid}. ${friend}`).join('\n');
        embed.addFields({ name: 'Friend List (1)', value: '```arm\n' + friendList1 + '\n```', inline: true }, { name: 'Friend List (2)', value: '```markdown\n' + friendList2 + '\n```', inline: true });
    }
    else if (friends.length > 0) {
        const friendList = friends.map((friend, i) => `${i + 1}. ${friend}`).join('\n');
        embed.addFields({ name: 'Friend List', value: '```arm\n' + friendList + '\n```', inline: false });
    }
    else {
        embed.addFields({ name: 'Friend List', value: 'None', inline: false });
    }
    let headURL = `https://mc-heads.net/avatar/${profile.ign}/overlay`;
    try {
        const res = await axios.head(headURL);
        if (res.status !== 200) {
            headURL = `https://mc-heads.net/avatar/dewier/overlay`;
        }
    }
    catch (error) {
        headURL = `https://mc-heads.net/avatar/dewier/overlay`;
    }
    embed.setThumbnail(headURL);
    // Send the embed immediately (without delay) and pin it.
    try {
        const msg = await interaction.channel.send({ embeds: [embed] });
        await msg.pin();
    }
    catch (error) {
        console.error('Failed to pin message:', error);
    }
}
export async function handleAddCommand(interaction) {
    await interaction.deferReply();
    // Cast options to any to use getMentionable
    const mentionable = interaction.options.getMentionable('mentionable');
    const channel = interaction.channel;
    if (!mentionable) {
        await interaction.editReply({ content: 'Please specify a valid user or role to add.' });
        return;
    }
    await channel.permissionOverwrites.edit(mentionable.id, {
        ViewChannel: true,
        SendMessages: true
    });
    await channel.send(`${mentionable}`);
    const embed = new EmbedBuilder()
        .setColor(0x2e96e6)
        .setDescription(`> Granted ${mentionable} access to <#${channel.id}>.`);
    await interaction.editReply({ content: '', embeds: [embed] });
}
export async function handleRemoveCommand(interaction) {
    await interaction.deferReply();
    const mentionable = interaction.options.getMentionable('mentionable');
    const channel = interaction.channel;
    if (!mentionable) {
        await interaction.editReply({ content: 'Please specify a valid user or role to remove.' });
        return;
    }
    await channel.permissionOverwrites.delete(mentionable.id);
    const embed = new EmbedBuilder()
        .setColor(0xe62e2e)
        .setDescription(`> Removed ${mentionable} access from <#${channel.id}>.`);
    await interaction.editReply({ embeds: [embed] });
}
export async function promptReason(client, interaction, action) {
    const modal = new ModalBuilder()
        .setCustomId(`reason_${action}`)
        .setTitle('Reason for Action');
    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Please provide a reason:')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    // Cast interaction to any so that showModal is recognized
    await interaction.showModal(modal);
}
export async function handleClaimTicket(client, interaction, reason) {
    try {
        await interaction.deferReply({ ephemeral: true });
        const ticket = await prisma.ticket.findFirst({ where: { channelId: interaction.channel?.id } });
        if (!ticket) {
            await interaction.editReply({ content: 'Ticket not found.' });
            return;
        }
        await prisma.ticket.update({
            where: { id: ticket.id },
            data: { status: 'claimed' }
        });
        if (!interaction.channel || !(interaction.channel instanceof TextChannel)) {
            await interaction.editReply({ content: 'Channel not found or invalid.' });
            return;
        }
        const ticketChannel = interaction.channel;
        const ticketCreator = await interaction.guild?.members.fetch(ticket.userId);
        const ticketCreatorUsername = ticketCreator ? ticketCreator.user.username : 'Unknown User';
        let logsChannelId = config.ticketLogsChannelId1;
        if (!['General', 'Appeal', 'Store'].includes(ticket.ticketType)) {
            logsChannelId = config.ticketLogsChannelId2;
        }
        const logsChannelFetched = await interaction.guild?.channels.fetch(logsChannelId);
        if (!logsChannelFetched || !(logsChannelFetched instanceof TextChannel)) {
            await interaction.editReply({ content: 'Logs channel not found or invalid.' });
            return;
        }
        const logsChannel = logsChannelFetched;
        const transcriptFile = `transcripts/chat_${ticketChannel.name}.html`;
        const pythonCmd = `python src/export/main.py -t "${config.token}" -c ${ticketChannel.id} -o "${transcriptFile}" -l 100 --tz_info "UTC"`;
        const { stdout, stderr } = await execAsync(pythonCmd);
        console.log(stdout);
        if (stderr)
            console.error(stderr);
        const transcriptMessage = await logsChannel.send({ files: [transcriptFile] });
        const transcriptUrl = transcriptMessage.attachments.first()?.url;
        if (!transcriptUrl) {
            await interaction.editReply({ content: 'Failed to obtain transcript URL.' });
            return;
        }
        await prisma.ticket.update({
            where: { id: ticket.id },
            data: { transcriptUrl }
        });
        const nowTs = Math.floor(Date.now() / 1000);
        const logEmbed = new EmbedBuilder()
            .setAuthor({ name: `${ticket.ticketType} Ticket`, iconURL: interaction.guild?.iconURL() || '' })
            .setTitle(`${ticket.ticketNumber} | ${ticketCreatorUsername}`)
            .setDescription(`> **Ticket Claimed ➤** <t:${nowTs}:F>\n` +
            `> **Claimed By ➤** <@${interaction.user.id}>\n` +
            `> **Reason ➤** \`${reason}\``)
            .setTimestamp();
        const detailsButton = new ButtonBuilder()
            .setCustomId(`ticket_details_${ticket.ticketNumber}`)
            .setLabel('Ticket Details')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('<a:Exclamation_3:1052609902285168781>');
        const detailsRow = new ActionRowBuilder().addComponents(detailsButton);
        await logsChannel.send({ embeds: [logEmbed], components: [detailsRow] });
        if (ticketCreator) {
            await ticketCreator.send({ embeds: [logEmbed], components: [detailsRow] });
        }
        fs.unlink(transcriptFile, (err) => {
            if (err)
                console.error('Error deleting transcript file:', err);
            else
                console.log('Transcript file deleted.');
        });
        await ticketChannel.delete();
        await interaction.editReply({ content: 'Ticket successfully claimed and closed.' });
    }
    catch (error) {
        console.error('Error in handleClaimTicket:', error);
        await interaction.editReply({ content: 'Failed to claim the ticket.' });
    }
}
