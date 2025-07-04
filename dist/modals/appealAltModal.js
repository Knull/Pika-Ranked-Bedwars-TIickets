// File: src/modals/appealAltModal.ts
import { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import prisma from '../utils/database.js';
import { handlePlayerInfo } from '../handlers/ticketHandlers.js';
import { createTicket } from '../handlers/ticketCreationDispatcher.js';
// Show the alt appeal modal (uses StringSelectMenuInteraction).
export function showAppealAltModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('appeal_alt_modal')
        .setTitle('Alt Verification');
    const ignInput = new TextInputBuilder()
        .setCustomId('ign')
        .setLabel('What is your In-Game Name?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(ignInput));
    interaction.showModal(modal);
}
// Handle the alt appeal modal submission.
export async function handleAppealAltModal(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const ign = interaction.fields.getTextInputValue('ign');
    try {
        const url = `https://stats.pika-network.net/api/profile/${encodeURIComponent(ign)}`;
        const { data: profile } = await axios.get(url);
        if (!profile) {
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setDescription(`> The player \`${ign}\` does not exist on Pika-Bedwars servers.\n- Enter a valid IGN please.`);
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        // Upsert player's profile data.
        await prisma.playerProfile.upsert({
            where: { discordUserId: interaction.user.id },
            update: {
                ign,
                lastSeen: profile.lastSeen ? new Date(profile.lastSeen) : null,
                ranks: profile.ranks,
                clanName: profile.clan ? profile.clan.name : 'No Clan',
                rankInfo: profile.rank,
                friends: profile.friends ? profile.friends.map((f) => f.username) : []
            },
            create: {
                discordUserId: interaction.user.id,
                ign,
                lastSeen: profile.lastSeen ? new Date(profile.lastSeen) : null,
                ranks: profile.ranks,
                clanName: profile.clan ? profile.clan.name : 'No Clan',
                rankInfo: profile.rank,
                friends: profile.friends ? profile.friends.map((f) => f.username) : []
            }
        });
        // Fetch Alt Appeal instructions from TicketConfig.
        const configEntry = await prisma.ticketConfig.findUnique({ where: { ticketType: "Alt Appeal" } });
        const instructions = configEntry && configEntry.useCustomInstructions && configEntry.instructions
            ? configEntry.instructions
            : "Please provide your appeal details to verify your identity.";
        // Use "Alt Appeal" as the ticket type.
        const ticketChannel = await createTicket(interaction, "Alt Appeal", { title: "Alt Appeal Ticket", description: instructions }, false);
        // Send player info embed.
        await handlePlayerInfo({ channel: ticketChannel, user: interaction.user, member: interaction.member, guild: interaction.guild }, interaction.client);
        await interaction.editReply({ content: `Your alt appeal ticket has been created: <#${ticketChannel.id}>` });
    }
    catch (error) {
        console.error('Error in alt appeal:', error);
        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription(`> The player \`${ign}\` does not exist on Pika-Bedwars servers.\n- Enter a valid IGN please.`);
        await interaction.editReply({ embeds: [embed] });
    }
}
