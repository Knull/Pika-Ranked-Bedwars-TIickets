import { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { RoleSelectCache } from '../utils/roleSelectCache.js';
export async function handleTicketConfigPermissions(interaction) {
    const ticketType = interaction.options.getString('tickettype', true);
    if (!interaction.guild) {
        await interaction.editReply({ content: 'Guild not found' });
        return;
    }
    // List of role IDs you want to show.
    const rolesToShow = [
        "1228653981010497597",
        "1325778907286212608",
        "1338957456918708235",
        "1228653981010497599",
        "1228653981010497598",
        "1228653981010497601",
        "1228653981048377366",
        "1228653981048377371",
        "1345028092996882432",
        "1228653981048377373",
        "1228653981086257183",
        "1228653981086257188",
        "1228653981086257184",
        "1228653981115355196"
    ];
    // Define a pool of 30 emojis.
    const emojiPool = [
        "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
        "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
        "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩"
    ];
    // Build options by fetching each role from the guild cache.
    const options = rolesToShow.map(roleId => {
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role)
            return null;
        // Role names must be 25 characters max for a select menu option.
        let label = role.name;
        if (label.length > 25) {
            label = label.substring(0, 22) + '...';
        }
        // Number of members having this role.
        const memberCount = role.members.size;
        // Pick a random emoji from the pool.
        const randomEmoji = emojiPool[Math.floor(Math.random() * emojiPool.length)];
        return {
            label,
            value: role.id,
            description: `${memberCount} members`,
            emoji: { name: randomEmoji }
        };
    }).filter(o => o !== null);
    // Create a custom select menu with the options.
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`config_permissions_${ticketType}`)
        .setPlaceholder(`Select roles for ${ticketType} tickets`)
        .addOptions(options)
        .setMinValues(0)
        .setMaxValues(options.length); // up to all provided options
    const row = new ActionRowBuilder().addComponents(selectMenu);
    const embed = {
        title: "Permissions Config",
        description: `- Ticket Type: \`${ticketType}\`\n> Use the dropdown below to adjust permissions.`,
    };
    await interaction.editReply({ embeds: [embed], components: [row] });
}
export async function handleConfigPermissions(interaction) {
    // Remove the prefix to get the ticket type.
    const ticketType = interaction.customId.replace('config_permissions_', '');
    // The values are the role IDs selected.
    const selectedRoleIds = interaction.values;
    const cacheKey = `${interaction.user.id}_${ticketType}`;
    RoleSelectCache.set(cacheKey, selectedRoleIds);
    // Fetch all roles from the guild.
    const rolesMap = await interaction.guild?.roles.fetch();
    const rolesArray = rolesMap ? Array.from(rolesMap.values()) : [];
    // Filter the roles to include only those selected.
    const selectedRoles = rolesArray.filter(role => selectedRoleIds.includes(role.id));
    const roleNames = selectedRoles.map(role => role.name).join(', ') || 'None';
    const updatedEmbed = new EmbedBuilder()
        .setTitle("Permissions Config")
        .setDescription(`- Ticket Type: \`${ticketType}\`\n> Use the dropdown below to adjust permissions.\n\n\`\`\`Roles Selected:\n${roleNames}\n\`\`\``);
    const confirmButton = new ButtonBuilder()
        .setCustomId(`confirm_permissions_${ticketType}`)
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success);
    const cancelButton = new ButtonBuilder()
        .setCustomId(`cancel_permissions_${ticketType}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger);
    const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
    await interaction.update({ embeds: [updatedEmbed], components: [buttonRow] });
}
