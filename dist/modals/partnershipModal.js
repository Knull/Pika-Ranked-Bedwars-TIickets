// File: src/modals/partnershipModal.ts
import { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import { createTicketChannel } from '../handlers/ticketHandlers.js';
import prisma from '../utils/database.js';
export function showPartnershipModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('partnership_modal')
        .setTitle('Partnership Application');
    const serverNameInput = new TextInputBuilder()
        .setCustomId('server_name')
        .setLabel('Name of your server')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    const inviteInput = new TextInputBuilder()
        .setCustomId('invite_link')
        .setLabel('Invite Link')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Reason for partnership')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(serverNameInput), new ActionRowBuilder().addComponents(inviteInput), new ActionRowBuilder().addComponents(reasonInput));
    interaction.showModal(modal);
}
export async function handlePartnershipModal(interaction) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }
    catch (error) {
        console.error("Error deferring modal interaction:", error);
    }
    const serverName = interaction.fields.getTextInputValue('server_name');
    const inviteLink = interaction.fields.getTextInputValue('invite_link');
    const reason = interaction.fields.getTextInputValue('reason');
    console.log(`Received partnership modal submission:
    Server Name: ${serverName}
    Invite Link: ${inviteLink}
    Reason: ${reason}`);
    // Validate the invite link.
    let invite;
    try {
        invite = await interaction.client.fetchInvite(inviteLink, { withCounts: true });
    }
    catch (error) {
        console.error("Error fetching invite:", error);
        const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription(`> The invite link provided is invalid. Please try again.`);
        await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        return;
    }
    const inviteData = invite;
    if (!inviteData.guild || !inviteData.channel) {
        console.error("Fetched invite does not include expected properties.");
        const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription(`> The invite link provided is missing required data. Please try again with a proper guild invite.`);
        await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        return;
    }
    let memberCount = inviteData.approximateMemberCount || 0;
    if (memberCount === 0) {
        console.warn("Member count is 0; this may be because the bot is not in the target guild.");
    }
    console.log(`Fetched member count: ${memberCount}`);
    let eligibilityText = '';
    if (memberCount < 500) {
        eligibilityText = 'Small server partnership';
    }
    else if (memberCount >= 500 && memberCount < 1000) {
        eligibilityText = 'Eligible for Ping4Ping partnership (smaller server pricing)';
    }
    else {
        eligibilityText = 'Eligible for standard partnership options';
    }
    console.log(`Eligibility determined: ${eligibilityText}`);
    // Fetch partnership instructions from TicketConfig.
    const configEntry = await prisma.ticketConfig.findUnique({ where: { ticketType: "Partnership" } });
    const partnershipInstructions = configEntry && configEntry.useCustomInstructions && configEntry.instructions
        ? configEntry.instructions
        : `### PRBW is no longer doing free partnerships.
    
Server must be Minecraft related (exceptions can be made, e.g., for performance enhancing softwares).
- **Server must have 1,000+ members. (In this case, we'll do a NoPing4Ping partnership, where you have to ping for our advertisement but we won't)**
- **For a Ping4Ping or a partnership with a smaller server, the prices are given below:**
\`\`\`arm
1. Simple Ping4Ping partnership, if your server is above 1000 members will cost $15 USD.
2. A Ping4Ping partnership with smaller servers may cost up to $20 USD.
3. A Ping4Ping CAN BE FREE for servers with 1.25x the number of members of PRBW.
4. A simple partnership with no pings for servers of any member count will cost $10 USD.
\`\`\``;
    // Create the ticket channel.
    const ticketData = {
        title: 'Partnership Ticket',
        description: `${reason}` // The main embed will use the user-provided description.
    };
    let ticketChannel;
    try {
        ticketChannel = await createTicketChannel(interaction, 'Partnership', ticketData, false);
        console.log(`Created ticket channel with ID: ${ticketChannel.id}`);
    }
    catch (error) {
        console.error('Failed to create partnership ticket:', error);
        const errEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription('> There was an error creating your partnership ticket. Please try again later.');
        try {
            await interaction.editReply({ embeds: [errEmbed] });
        }
        catch (err) {
            console.error("Error sending ticket creation failure reply:", err);
        }
        return;
    }
    // Send a plain-text message with the invite link.
    try {
        await ticketChannel.send(`Server Invite: ${inviteLink}`);
        console.log("Sent invite link message to ticket channel.");
    }
    catch (error) {
        console.error(`Error sending invite link message: ${error}`);
    }
    if (memberCount !== 0) {
        const eligibilityEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(`> You are Eligible for:\n- ${eligibilityText}`);
        try {
            await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [eligibilityEmbed] });
            console.log("Sent eligibility embed.");
        }
        catch (error) {
            console.error(`Error sending eligibility embed: ${error}`);
        }
    }
    try {
        await interaction.editReply({
            content: `Your partnership ticket has been created: <#${ticketChannel.id}>`
        });
    }
    catch (error) {
        console.error(`Error sending confirmation reply: ${error}`);
    }
}
