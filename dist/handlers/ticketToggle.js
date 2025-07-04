import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import config from "../config/config.js";
export const allowedRoleIds = [
    config.managerRoleId,
    config.ownerRoleId
];
export const ticketSettings = {
    mode: "channel",
    pingRoles: false
};
export async function handleTicketToggleCommand(interaction) {
    if (!interaction.guild || !interaction.member) {
        await interaction.reply({ content: "This command can only be used in a guild.", ephemeral: true });
        return;
    }
    const member = interaction.member;
    const hasAllowedRole = member.roles.cache.some((role) => allowedRoleIds.includes(role.id));
    if (!hasAllowedRole) {
        await interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
        return;
    }
    const mode = interaction.options.getString("mode", true);
    if (mode === "channel") {
        ticketSettings.mode = "channel";
        await interaction.reply({ content: "Ticketing mode updated to **channel-based**.", ephemeral: true });
    }
    else if (mode === "thread") {
        ticketSettings.mode = "thread";
        const embed = new EmbedBuilder()
            .setTitle("Query 1")
            .setDescription("Should the bot **ping** the roles associated with the channel?\n\nExample: If @testrole is configured in the channel permissions, should they be pinged when a ticket is created?");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_toggle_ping_yes").setLabel("Yes").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId("ticket_toggle_ping_no").setLabel("No").setStyle(ButtonStyle.Danger));
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
    else {
        await interaction.reply({ content: "Invalid mode option.", ephemeral: true });
    }
}
export async function handleTicketToggleButtonInteraction(interaction) {
    const customId = interaction.customId;
    if (customId === "ticket_toggle_ping_yes" || customId === "ticket_toggle_ping_no") {
        const pingChoice = customId === "ticket_toggle_ping_yes";
        const embed = new EmbedBuilder()
            .setTitle("Confirm Settings")
            .setDescription(`You chose to **${pingChoice ? "ping" : "not ping"}** roles when creating tickets.\n\nDo you confirm this configuration?`);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`ticket_toggle_confirm_${pingChoice}`).setLabel("Confirm").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId("ticket_toggle_cancel").setLabel("Cancel").setStyle(ButtonStyle.Danger));
        await interaction.update({ embeds: [embed], components: [row] });
        return;
    }
    if (customId.startsWith("ticket_toggle_confirm_")) {
        const parts = customId.split("_");
        const pingChoice = parts[parts.length - 1] === "true";
        ticketSettings.pingRoles = pingChoice;
        await interaction.update({
            content: `Ticketing mode updated to **thread-based** with role pings ${pingChoice ? "enabled" : "disabled"}.`,
            embeds: [],
            components: []
        });
        return;
    }
    if (customId === "ticket_toggle_cancel") {
        await interaction.update({ content: "Ticketing mode update canceled.", embeds: [], components: [] });
        return;
    }
}
