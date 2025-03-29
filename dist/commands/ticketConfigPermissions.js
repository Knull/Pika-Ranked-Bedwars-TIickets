import { ActionRowBuilder, RoleSelectMenuBuilder } from 'discord.js';
export async function handleTicketConfigPermissions(interaction) {
    const ticketType = interaction.options.getString('tickettype', true);
    if (!interaction.guild) {
        await interaction.reply({ content: 'Guild not found', ephemeral: true });
        return;
    }
    // Use the built-in RoleSelect menu (available in discord.js v14).
    const roleSelect = new RoleSelectMenuBuilder()
        .setCustomId(`config_permissions_${ticketType}`)
        .setPlaceholder(`Select roles for ${ticketType} tickets`)
        .setMinValues(0)
        .setMaxValues(25); // Discord allows up to 25 roles per select menu.
    const row = new ActionRowBuilder().addComponents(roleSelect);
    const embed = {
        title: "Permissions Config",
        description: `- Ticket Type: \`${ticketType}\`\n> Use the dropdown below to adjust permissions.`,
    };
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}
