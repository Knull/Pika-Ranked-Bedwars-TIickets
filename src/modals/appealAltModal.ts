import { 
  ModalBuilder, 
  TextInputBuilder, 
  ActionRowBuilder, 
  TextInputStyle, 
  StringSelectMenuInteraction, 
  EmbedBuilder, 
  ModalSubmitInteraction 
} from 'discord.js';
import axios from 'axios';
import prisma from '../utils/database.js';
import { createTicketChannel, handlePlayerInfo } from '../handlers/ticketHandlers.js';

// Show the alt appeal modal (uses StringSelectMenuInteraction).
export function showAppealAltModal(interaction: StringSelectMenuInteraction): void {
  const modal = new ModalBuilder()
    .setCustomId('appeal_alt_modal')
    .setTitle('Alt Verification');
  const ignInput = new TextInputBuilder()
    .setCustomId('ign')
    .setLabel('What is your In-Game Name?')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(ignInput)
  );

  // This method is valid on a select menu interaction:
  interaction.showModal(modal);
}

// Handle the alt appeal modal submission (uses ModalSubmitInteraction).
export async function handleAppealAltModal(interaction: ModalSubmitInteraction): Promise<void> {
  // Defer reply immediately.
  await interaction.deferReply({ ephemeral: true });
  const ign = interaction.fields.getTextInputValue('ign');
  try {
    const url = `https://stats.pika-network.net/api/profile/${encodeURIComponent(ign)}`;
    const { data: profile } = await axios.get(url);
    if (!profile) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription(`> The player \`${ign}\` does not exist on Pika-Bedwars servers.\n- Enter a valid IGN please.`);
      await interaction.followUp({ embeds: [embed], ephemeral: true });
      return;
    }
    
    // Upsert the player's profile data.
    await prisma.playerProfile.upsert({
      where: { discordUserId: interaction.user.id },
      update: {
        ign,
        lastSeen: profile.lastSeen ? new Date(profile.lastSeen) : null,
        ranks: profile.ranks,
        clanName: profile.clan ? profile.clan.name : 'No Clan',
        rankInfo: profile.rank,
        friends: profile.friends ? profile.friends.map((f: any) => f.username) : []
      },
      create: {
        discordUserId: interaction.user.id,
        ign,
        lastSeen: profile.lastSeen ? new Date(profile.lastSeen) : null,
        ranks: profile.ranks,
        clanName: profile.clan ? profile.clan.name : 'No Clan',
        rankInfo: profile.rank,
        friends: profile.friends ? profile.friends.map((f: any) => f.username) : []
      }
    });
    
    const instructions = "To prove you are not an alt, do the following:\n" +
                     "1. Send a screenshot of your Discord server list.\n" +
                     "2. Explain how you found out about Pika Ranked Bedwars.\n" +
                     "3. If your account is less than 30 days old, explain why.\n" +
                     "4. If this is a new account of yours, tell us what happened to your previous account (or why you switched accounts)";
    
    // Create the ticket channel in the appeals category.
    // Pass shouldDefer = false because we already deferred here.
    const ticketChannel = await createTicketChannel(interaction, "Appeal", { title: "Ticket Instructions 👇", description: instructions }, false);
    
    // Call handlePlayerInfo to post player stats in the ticket channel.
    await handlePlayerInfo({ channel: ticketChannel, user: interaction.user, member: interaction.member, guild: interaction.guild }, interaction.client);
    
    // Follow up with a confirmation.
    await interaction.followUp({ content: `Your alt appeal ticket has been created: <#${ticketChannel.id}>`, ephemeral: true });
  } catch (error) {
    console.error('Error in alt appeal:', error);
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setDescription(`> The player \`${ign}\` does not exist on Pika-Bedwars servers.\n- Enter a valid IGN please.`);
      await interaction.followUp({ embeds: [embed], ephemeral: true });
  }
}