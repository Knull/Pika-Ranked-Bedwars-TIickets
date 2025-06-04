// src/handlers/threadTicketHandlers.ts
import {
  TextChannel,
  ThreadChannel,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  OverwriteResolvable,
  PermissionsBitField,
  ButtonInteraction,
  ModalSubmitInteraction,
  ChatInputCommandInteraction
} from 'discord.js';
import config from '../config/config.js';
import prisma from '../utils/database.js';
import { shouldPingRoles } from '../utils/ticketModeSettings.js';
import { getCategoryId } from '../utils/discordUtils.js';

//
// Ticket creation – adjusted for pings enabled vs disabled
//
export async function createTicketThread(
  interaction: any,
  ticketType: string,
  data: { title: string; description: string; banType?: string },
  shouldDefer: boolean = true
): Promise<ThreadChannel> {
  const { guild, user } = interaction;
  if (!guild) {
    if (shouldDefer && !interaction.deferred) {
      await interaction.reply({ content: 'Guild not found.', ephemeral: true });
    }
    throw new Error('Guild not found');
  }
  if (shouldDefer && !interaction.deferred) {
    await interaction.deferReply({ ephemeral: true });
  }

  // Fetch ticket counter.
  const settings = await prisma.ticketSettings.findUnique({ where: { id: 1 } });
  let ticketCounter = settings?.ticketCounter || 1;
  const prefix = '┃';
  const username = user.username.split(/[\s\W_]+/)[0] || user.username;

  // Determine naming based on priority.
  const isSpecial = interaction.member.roles.cache.has(config.boosterRoleId);
  let threadName: string;
  if (isSpecial) {
    threadName = `🔥Priority Support・${username}`;
  } else {
    threadName = `🟢${username}・${ticketType}`;
  }

  // Determine effective ticket type.
  let effectiveTicketType = ticketType;
  if (ticketType === 'Ban Appeal') {
    if (data.banType === 'screenshare_appeal') {
      effectiveTicketType = 'Ban Appeal: Screenshare';
    } else if (data.banType === 'strike_ban') {
      effectiveTicketType = 'Ban Appeal: Strike';
    }
  }

  // Fetch configuration.
  const configEntry = await prisma.ticketConfig.findUnique({ where: { ticketType: effectiveTicketType } });
  if (!configEntry || !Array.isArray(configEntry.permissions) || !configEntry.permissions.length) {
    throw new Error(`No permissions found in DB for ticketType ${effectiveTicketType}`);
  }
  const allowedRoleIds = configEntry.permissions as string[];

  // Build permission overwrites.
  const permissionOverwrites: OverwriteResolvable[] = [
    {
      id: guild.id,
      deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
    },
    ...allowedRoleIds.map(roleId => ({
      id: roleId,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
    })),
  ];

  // Get parent category from a helper if needed.
  const parentCategoryId = getCategoryId(effectiveTicketType);
  if (!parentCategoryId) {
    throw new Error(`Parent category not set for ${effectiveTicketType}`);
  }

  // Always use the ticketsChannelId for creating private threads.
  const baseChannel = await guild.channels.fetch(config.ticketsChannelId);
  if (!baseChannel || !baseChannel.isTextBased()) {
    throw new Error('Base channel not found or invalid.');
  }
  const textChannel = baseChannel as TextChannel;

  // Create a private thread in the base channel.
  const thread = await textChannel.threads.create({
    name: threadName,
    autoArchiveDuration: 1440, // 24 hours
    type: ChannelType.PrivateThread,
    reason: 'Ticket creation (private thread)',
  });

  // Send welcome message inside the private thread.
  let rolePings = allowedRoleIds.map(roleId => `||<@&${roleId}>||`).join(' ');
  const welcomeMessage = `Hey <@${user.id}> 👋! ${rolePings}\n\`\`\`Please wait patiently for staff to reply. If no one responds, you may ping staff. Thanks!\`\`\``;
  await thread.send(welcomeMessage);

  // Build the main ticket embed.
  let embed = new EmbedBuilder().setColor(0x0099FF);
  if (ticketType === 'Ban Appeal') {
    embed.setAuthor({ name: `${effectiveTicketType} Ticket`, iconURL: user.displayAvatarURL() });
    embed.setTitle(effectiveTicketType).setDescription(`\`\`\`${data.description}\`\`\``);
  } else if (ticketType === 'Store') {
    const storeInstr =
      configEntry.useCustomInstructions && configEntry.instructions
        ? configEntry.instructions
        : 'No store instructions configured.';
    embed.setAuthor({ name: `${ticketType} Ticket`, iconURL: user.displayAvatarURL() });
    embed.setTitle('Store Purchase').setDescription(`\`\`\`${storeInstr}\`\`\``);
  } else if (ticketType === 'Alt Appeal') {
    const altInstr =
      configEntry.useCustomInstructions && configEntry.instructions
        ? configEntry.instructions
        : 'No alt appeal instructions configured.';
    embed.setAuthor({ name: `${ticketType} Ticket`, iconURL: user.displayAvatarURL() });
    let description = data.description;
    if (description.trim().endsWith(altInstr.trim())) {
      embed.setTitle(data.title).setDescription(`\`\`\`${description}\`\`\``);
    } else {
      embed.setTitle(data.title).setDescription(`\`\`\`${description}\n\n${altInstr}\`\`\``);
    }
  } else if (ticketType === 'Partnership') {
    embed.setAuthor({ name: `${ticketType} Ticket`, iconURL: user.displayAvatarURL() });
    embed.setTitle(data.title).setDescription(`\`\`\`${data.description}\`\`\``);
  } else {
    embed.setAuthor({ name: `${ticketType} Ticket`, iconURL: user.displayAvatarURL() });
    embed.setTitle(data.title).setDescription(`\`\`\`${data.description}\`\`\``);
  }

  // Build an action row with a close button.
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('close_thread')
      .setLabel('Close')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒')
  );
  const ticketMsg = await thread.send({ embeds: [embed], components: [row] });

  // If it's a Partnership ticket, send a separate Partnership Requirements embed.
  if (ticketType === 'Partnership') {
    const partInfo =
      configEntry.useCustomInstructions && configEntry.instructions
        ? configEntry.instructions
        : 'No partnership instructions configured.';
    const partnershipEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setAuthor({
        name: 'Pinned Message',
        iconURL: 'https://cdn.discordapp.com/emojis/1348557777785716756.webp?size=44'
      })
      .setTitle('Partnership Requirements')
      .setDescription(partInfo);
    const sentMsg = await thread.send({ embeds: [partnershipEmbed] });
    await sentMsg.pin().catch(e => console.error('Error pinning partnership embed:', e));
  }

  // Now, send a public announcement in ticketsChannelId2.
  let outsideMsgId: string | undefined = undefined;
  const announcementChannel = await guild.channels.fetch(config.ticketsChannelId2);
  if (announcementChannel && announcementChannel.isTextBased()) {
    const announceChannel = announcementChannel as TextChannel;
    let announcementContent: string;
    if (isSpecial) {
      announcementContent =
        `▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
        `# PRIORITY TICKET 🔥\n` +
        `▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
        `<@${user.id}> has created a \`${ticketType}\` Ticket\n` +
        `Status: 🟢 Open\n` +
        `Channel Link: ${thread.url}`;
    } else {
      announcementContent =
        `<@${user.id}> has created a \`${ticketType}\` Ticket\n` +
        `Status: 🟢 Open\n` +
        `Channel Link: ${thread.url}`;
    }

    const accessButton = new ButtonBuilder()
      .setLabel('Access Ticket')
      .setStyle(ButtonStyle.Link)
      .setURL(thread.url);

    const announcementRow = new ActionRowBuilder<ButtonBuilder>().addComponents(accessButton);
    const announcementMsg = await announceChannel.send({ content: announcementContent, components: [announcementRow] });
    outsideMsgId = announcementMsg.id;
  }

  // Create the ticket record, storing outsideMessageId if available.
  await prisma.ticket.create({
    data: {
      ticketNumber: ticketCounter,
      ticketType: effectiveTicketType,
      status: 'open',
      channelId: thread.id,
      userId: user.id,
      ticketMessageId: ticketMsg.id,
      reason: data.description,
      outsideMessageId: outsideMsgId,
    },
  });

  // Increment the ticket counter.
  await prisma.ticketSettings.update({
    where: { id: 1 },
    data: { ticketCounter: ticketCounter + 1 },
  });

  if (shouldDefer) {
    await interaction.editReply({
      content: `Your ticket has been opened. Head over to <#${thread.id}> to continue.`,
    }).catch(() => {});
  }
  return thread;
}



//
// Ticket closing – adjusted
//
export async function handleCloseThread(interaction: ButtonInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.channel;
    if (!channel || !channel.isThread()) {
      await interaction.followUp({ content: 'Ticket thread not found or invalid.', ephemeral: true });
      return;
    }
    const thread = channel as ThreadChannel;

    // Lock the thread.
    await thread.setLocked(true, 'Ticket closed.');

    // For non-priority tickets, update thread name: change green (🟢) to red (🔴).
    if (thread.name.startsWith('🟢')) {
      const newName = '🔴' + thread.name.slice(2);
      await thread.setName(newName);
    }

    // Remove the closer from the thread so they leave.
    await thread.members.remove(interaction.user.id).catch(err => {
      console.error("Error removing ticket closer from thread:", err);
    });

    // Build closure embed with Reopen button explicitly enabled.
    const closeEmbed = new EmbedBuilder()
      .setColor(0xffff00)
      .setDescription(`> 🔒 Ticket closed by <@${interaction.user.id}>`);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('reopen_thread')
        .setLabel('Reopen')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(false)
    );
    await thread.send({ embeds: [closeEmbed], components: [row] });

    // If an outside announcement message exists, update its status.
    const ticket = await prisma.ticket.findFirst({ where: { channelId: thread.id } });
    if (ticket && ticket.outsideMessageId) {
      const baseChannel = await interaction.guild?.channels.fetch(config.ticketsChannelId2);
      if (baseChannel && baseChannel.isTextBased()) {
        const textChannel = baseChannel as TextChannel;
        try {
          const outsideMsg = await textChannel.messages.fetch(ticket.outsideMessageId);
          // Replace the status text with "Status: 🔴 Closed"
          const newContent = outsideMsg.content.replace(/Status:\s*[^\n]+/, "Status: 🔴 Closed");
          await outsideMsg.edit({ content: newContent });
        } catch (err) {
          console.error("Error updating outside message:", err);
        }
      }
    }

    // Update ticket record: mark closed and store transcript URL.
    await prisma.ticket.updateMany({
      where: { channelId: thread.id },
      data: { status: 'closed', transcriptUrl: thread.url }
    });

    // --- Log Embed: Send to transcript channel and DM the ticket creator ---
    let ticketCreator: any = null;
    try {
      ticketCreator = await interaction.guild?.members.fetch(ticket!.userId);
    } catch (err) {
      console.error("Error fetching ticket creator:", err);
    }
    const nowTs = Math.floor(Date.now() / 1000);
    const transcriptUrl = thread.url;
    const transcriptChannelId =
      ticket?.ticketType === 'General'
        ? config.transcriptChannel1
        : config.transcriptChannel2;
    const logChannel = await interaction.guild?.channels.fetch(transcriptChannelId) as TextChannel;

    const logEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${ticket!.ticketType} Ticket`,
        iconURL: interaction.guild?.iconURL() || ''
      })
      .setTitle(`${ticket!.ticketNumber} | ${ticketCreator ? ticketCreator.user.username : ticket!.userId}`)
      .setDescription(
        `> Ticket Claimed ➤ <t:${nowTs}:F>\n` +
        `> Claimed By ➤ <@${interaction.user.id}>\n` +
        `> Available ➤ ${transcriptUrl}`
      )
      .setTimestamp();


    const advancedButton = new ButtonBuilder()
      .setCustomId(`advanced_ticketLog_${ticket!.id}`)
      .setLabel('Advanced')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⚙️');

    const accessTicketButton = new ButtonBuilder()
      .setLabel('Access Ticket')
      .setStyle(ButtonStyle.Link)
      .setURL(transcriptUrl);

    const logRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      advancedButton,
      accessTicketButton
    );

    if (logChannel) {
      await logChannel.send({ embeds: [logEmbed], components: [logRow] });
    }

    // DM the ticket creator with the same log embed.
    if (ticketCreator) {
      try {
        await ticketCreator.send({ embeds: [logEmbed], components: [logRow] });
      } catch (dmError) {
        console.error("Error sending DM to ticket creator:", dmError);
      }
    }
    // --- End new functionality ---

    await interaction.followUp({ content: 'Ticket has been closed (thread locked).', ephemeral: true });
  } catch (error) {
    console.error('Error in handleCloseThread:', error);
    await interaction.followUp({ content: 'Failed to close ticket.', ephemeral: true });
  }
}
export async function handleReopenThread(interaction: ButtonInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.channel;
    if (!channel || !channel.isThread()) {
      await interaction.followUp({ content: 'Ticket thread not found or invalid.', ephemeral: true });
      return;
    }
    const thread = channel as ThreadChannel;

    // Unlock the thread.
    await thread.setLocked(false, 'Ticket reopened.');

    // Update ticket record to open.
    const ticket = await prisma.ticket.findFirst({ where: { channelId: thread.id } });
    if (!ticket) {
      await interaction.followUp({ content: 'Ticket record not found.', ephemeral: true });
      return;
    }
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'open',
        lastMessageAt: new Date() // reset inactivity timer on reopen
      }
    });

    // Re-enable the Close button in the stored ticket message.
    try {
      const storedMsg = await thread.messages.fetch(ticket.ticketMessageId!);
      const updatedComponents = storedMsg.components.map(row => {
        const newRow = row.toJSON();
        newRow.components = newRow.components.map(comp => {
          if ('custom_id' in comp && comp.custom_id === 'close_thread') {
            comp.disabled = false;
          }
          return comp;
        });
        return newRow;
      });
      await storedMsg.edit({ components: updatedComponents });
    } catch (err) {
      console.error('Error updating stored ticket message:', err);
    }

    // Disable the Reopen button on the triggering message.
    try {
      const currentComponents = interaction.message.components.map(row => {
        const newRow = row.toJSON();
        newRow.components = newRow.components.map(comp => {
          if ('custom_id' in comp && comp.custom_id === 'reopen_thread') {
            comp.disabled = true;
          }
          return comp;
        });
        return newRow;
      });
      await interaction.message.edit({ components: currentComponents });
    } catch (err) {
      console.error('Error disabling reopen button:', err);
    }

    // For non-priority tickets, update thread name: change red (🔴) back to green (🟢).
    if (thread.name.startsWith('🔴')) {
      const newName = '🟢' + thread.name.slice(2);
      await thread.setName(newName);
    }

    // If an outside announcement exists, update its status to open.
    if (ticket.outsideMessageId) {
      const baseChannel = await interaction.guild?.channels.fetch(config.ticketsChannelId2);
      if (baseChannel && baseChannel.isTextBased()) {
        const textChannel = baseChannel as TextChannel;
        try {
          const outsideMsg = await textChannel.messages.fetch(ticket.outsideMessageId);
          const newContent = outsideMsg.content.replace(/Status:\s*[^\n]+/, "Status: 🟢 Open");
          await outsideMsg.edit({ content: newContent });
        } catch (err) {
          console.error("Error updating outside message on reopen:", err);
        }
      }
    }

    // Send a notification in the thread.
    const reopenEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setDescription(`> Ticket Reopened by <@${interaction.user.id}>`);
    const reopenMessage = `<@${ticket.userId}>, your ticket has been reopened by <@${interaction.user.id}>.\n**Ticket Reopened**`;
    await thread.send({ content: reopenMessage, embeds: [reopenEmbed] });

    // --- New functionality: Send a new public announcement for the reopened ticket ---
    // We'll determine if it's a priority ticket by checking if the thread name includes the priority indicator.
    const isPriority = thread.name.includes('🔥');
    const announcementChannel = await interaction.guild?.channels.fetch(config.ticketsChannelId2);
    if (announcementChannel && announcementChannel.isTextBased()) {
      const announceChannel = announcementChannel as TextChannel;
      let announcementContent: string;
      if (isPriority) {
        announcementContent =
          `▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
          `# PRIORITY TICKET 🔥\n` +
          `▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
          `<@${ticket.userId}> has reopened a \`${ticket.ticketType}\` Ticket\n` +
          `Status: 🟢 Open\n` +
          `Channel Link: ${thread.url}`;
      } else {
        announcementContent =
          `▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n`  +
          `<@${ticket.userId}> has reopened a \`${ticket.ticketType}\` Ticket\n` +
          `Status: 🟢 Open\n` +
          `Channel Link: ${thread.url}`;
      }
      const accessButton = new ButtonBuilder()
        .setLabel('Access Ticket')
        .setStyle(ButtonStyle.Link)
        .setURL(thread.url);
      const announcementRow = new ActionRowBuilder<ButtonBuilder>().addComponents(accessButton);
      await announceChannel.send({ content: announcementContent, components: [announcementRow] });
    }
    // --- End new functionality ---

    await interaction.followUp({ content: 'Ticket has been reopened.', ephemeral: true });
  } catch (error) {
    console.error('Error in handleReopenThread:', error);
    await interaction.followUp({ content: 'Failed to reopen ticket.', ephemeral: true });
  }
}
export async function handleCloseThreadCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.channel;
    if (!channel || !channel.isThread()) {
      await interaction.followUp({ content: 'Ticket thread not found or invalid.', ephemeral: true });
      return;
    }
    const thread = channel as ThreadChannel;

    // Lock the thread.
    await thread.setLocked(true, 'Ticket closed.');

    // Update thread name: change green (🟢) to red (🔴) if applicable.
    if (thread.name.startsWith('🟢')) {
      const newName = '🔴' + thread.name.slice(2);
      await thread.setName(newName);
    }

    // Get the ticket record.
    const ticket = await prisma.ticket.findFirst({ where: { channelId: thread.id } });
    if (ticket) {
      // Build a list of user IDs to remove: ticket creator + any added users.
      const usersToRemove: string[] = [];
      if (ticket.userId) {
        usersToRemove.push(ticket.userId);
      }
      if (ticket.added_user && Array.isArray(ticket.added_user)) {
        // Filter the array to include only strings
        const addedUsers = ticket.added_user.filter((user: unknown): user is string => typeof user === 'string');
        usersToRemove.push(...addedUsers);
      }

      // Remove all users concurrently.
      await Promise.all(
        usersToRemove.map(userId =>
          thread.members.remove(userId).catch(err => {
            console.error(`Error removing user ${userId} from thread:`, err);
          })
        )
      );
    }

    // Build closure embed with Reopen button enabled.
    const closeEmbed = new EmbedBuilder()
      .setColor(0xffff00)
      .setDescription(`> 🔒 Ticket closed by <@${interaction.user.id}>`);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('reopen_thread')
        .setLabel('Reopen')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(false)
    );
    await thread.send({ embeds: [closeEmbed], components: [row] });

    // If an outside announcement message exists, update its status.
    if (ticket && ticket.outsideMessageId) {
      const baseChannel = await interaction.guild?.channels.fetch(config.ticketsChannelId2);
      if (baseChannel && baseChannel.isTextBased()) {
        const textChannel = baseChannel as TextChannel;
        try {
          const outsideMsg = await textChannel.messages.fetch(ticket.outsideMessageId);
          const newContent = outsideMsg.content.replace(/Status:\s*[^\n]+/, "Status: 🔴 Closed");
          await outsideMsg.edit({ content: newContent });
        } catch (err) {
          console.error("Error updating outside message:", err);
        }
      }
    }

    // Update ticket record: mark closed and store transcript URL.
    await prisma.ticket.updateMany({
      where: { channelId: thread.id },
      data: { status: 'closed', transcriptUrl: thread.url }
    });

    // --- Log Embed: Send to transcript channel and DM the ticket creator ---
    let ticketCreator: any = null;
    try {
      ticketCreator = await interaction.guild?.members.fetch(ticket!.userId);
    } catch (err) {
      console.error("Error fetching ticket creator:", err);
    }
    const nowTs = Math.floor(Date.now() / 1000);
    const transcriptUrl = thread.url;
    const transcriptChannelId = ticket?.ticketType === 'General' ? config.transcriptChannel1 : config.transcriptChannel2;
    const logChannel = await interaction.guild?.channels.fetch(transcriptChannelId) as TextChannel;
    const logEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${ticket!.ticketType} Ticket`,
        iconURL: interaction.guild?.iconURL() || ''
      })
      .setTitle(`${ticket!.ticketNumber} | ${ticketCreator ? ticketCreator.user.username : ticket!.userId}`)
      .setDescription(
        `> Ticket Claimed ➤ <t:${nowTs}:F>\n` +
        `> Claimed By ➤ <@${interaction.user.id}>\n` +
        `> Available ➤ ${transcriptUrl}`
      )
      .setTimestamp();

    const advancedButton = new ButtonBuilder()
      .setCustomId(`advanced_ticketLog_${ticket!.id}`)
      .setLabel('Advanced')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⚙️');

    const accessTicketButton = new ButtonBuilder()
      .setLabel('Access Ticket')
      .setStyle(ButtonStyle.Link)
      .setURL(transcriptUrl);

    const logRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      advancedButton,
      accessTicketButton
    );

    if (logChannel) {
      await logChannel.send({ embeds: [logEmbed], components: [logRow] });
    }
    if (ticketCreator) {
      try {
        await ticketCreator.send({ embeds: [logEmbed], components: [logRow] });
      } catch (dmError) {
        console.error("Error sending DM to ticket creator:", dmError);
      }
    }
    // --- End log embed functionality ---

    await interaction.followUp({ content: 'Ticket has been closed (thread locked).', ephemeral: true });
  } catch (error) {
    console.error('Error in handleCloseThreadCommand:', error);
    await interaction.followUp({ content: 'Failed to close ticket.', ephemeral: true });
  }
}