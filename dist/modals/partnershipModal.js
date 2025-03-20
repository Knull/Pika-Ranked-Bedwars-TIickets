import { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import { createTicketChannel } from '../handlers/ticketHandlers.js';
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
    // Validate the invite link using client.fetchInvite.
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
    // Use the invite's approximateMemberCount (this may be 0 if not provided)
    let memberCount = inviteData.approximateMemberCount || 0;
    if (memberCount === 0) {
        console.warn("Member count is 0; this may be because the bot is not in the target guild.");
    }
    console.log(`Fetched member count: ${memberCount}`);
    // Determine eligibility based on member count.
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
    // Create the ticket channel using your existing createTicketChannel logic.
    const data = {
        title: 'Partnership Ticket',
        description: `${reason}`
    };
    let ticketChannel;
    try {
        ticketChannel = await createTicketChannel(interaction, 'Partnership', data, false);
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
    // Send a plain-text message with the invite link for staff review.
    try {
        await ticketChannel.send(`Server Invite: ${inviteLink}`);
        console.log("Sent invite link message to ticket channel.");
    }
    catch (error) {
        console.error(`Error sending invite link message: ${error}`);
    }
    // Send an embed with partnership requirements, using "arm" for code block styling.
    const requirementsEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setAuthor({
        name: 'Pinned Message',
        iconURL: 'https://cdn.discordapp.com/emojis/1348557777785716756.webp?size=44'
    })
        .setTitle('Partnership Requirements')
        .setDescription(`### PRBW is no longer doing free partnerships.\n\n` +
        `Server must be Minecraft related (exceptions can be made, e.g., for performance enhancing softwares).\n` +
        `- **Server must have 1,000+ members. (In this case, we'll do a NoPing4Ping partnership, where you have to ping for our advertisement but we won't)**\n` +
        `- **For a Ping4Ping or a partnership with a smaller server, the prices are given below:**\n` +
        "```arm\n" +
        "1. Simple Ping4Ping partnership, if your server is above 1000 members will cost $15 USD.\n" +
        "2. A Ping4Ping partnership with smaller servers may cost up to $20 USD.\n" +
        "3. A Ping4Ping CAN BE FREE for servers with 1.25x the number of members of PRBW.\n" +
        "4. A simple partnership with no pings for servers of any member count will cost $10 USD.\n" +
        "```");
    let reqMsg;
    try {
        reqMsg = await ticketChannel.send({ embeds: [requirementsEmbed] });
        console.log("Sent requirements embed.");
    }
    catch (error) {
        console.error(`Error sending requirements embed: ${error}`);
    }
    // Pin the requirements message.
    if (reqMsg) {
        try {
            await reqMsg.pin();
            console.log("Pinned requirements embed.");
        }
        catch (error) {
            console.error("Error pinning requirements embed:", error);
        }
    }
    // If memberCount is not zero, send another embed to show eligibility.
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
    // Finally, confirm to the user that the ticket was created.
    try {
        await interaction.editReply({
            content: `Your partnership ticket has been created: <#${ticketChannel.id}>`
        });
    }
    catch (error) {
        console.error(`Error sending confirmation reply: ${error}`);
    }
}
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
