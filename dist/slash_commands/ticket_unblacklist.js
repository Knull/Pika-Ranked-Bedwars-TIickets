import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import prisma from '../utils/database.js';
import config from '../config/config.js';
const data = new SlashCommandBuilder()
    .setName('ticket_unblacklist')
    .setDescription('Remove a user from the ticket blacklist')
    .addUserOption(opt => opt.setName('user').setDescription('User to unblacklist').setRequired(true));
async function execute(interaction) {
    const member = interaction.member;
    if (!member) {
        await interaction.reply({ content: `Only <@&${config.adminRoleId}> can use this command.`, ephemeral: true });
        return;
    }
    const roles = member.roles;
    if (!('cache' in roles)) {
        await interaction.reply({ content: `Only <@&${config.adminRoleId}> can use this command.`, ephemeral: true });
        return;
    }
    if (!roles.cache.has(config.adminRoleId)) {
        await interaction.reply({ content: `Only <@&${config.adminRoleId}> can use this command.`, ephemeral: true });
        return;
    }
    const target = interaction.options.getUser('user', true);
    await prisma.ticketBlacklist.deleteMany({ where: { userId: target.id } });
    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setDescription(`> Removed <@${target.id}> from the ticket blacklist`);
    await interaction.reply({ embeds: [embed] });
}
export default { data, execute };
