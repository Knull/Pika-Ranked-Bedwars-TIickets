import { ActionRowBuilder, SelectMenuBuilder, EmbedBuilder } from 'discord.js';
export async function showInitialAppealDropdown(interaction) {
    const selectMenu = new SelectMenuBuilder()
        .setCustomId('appeal_initial')
        .setPlaceholder('Select the punishment type you want to appeal')
        .addOptions([
        {
            label: 'Appeal a Ban',
            description: 'Appeal a ban',
            value: 'appeal_ban',
            emoji: '🔨'
        },
        {
            label: 'Appeal a Strike',
            description: 'Appeal a strike',
            value: 'appeal_strike',
            emoji: '⚖️'
        },
        {
            label: 'Appeal a Mute',
            description: 'Appeal a mute',
            value: 'appeal_mute',
            emoji: '🔇'
        }
    ]);
    const row = new ActionRowBuilder().addComponents(selectMenu);
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Appeal Ticket')
        .setDescription('Choose the punishment type you want to appeal.');
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}
export async function showBanTypeDropdown(interaction) {
    const selectMenu = new SelectMenuBuilder()
        .setCustomId('ban_type')
        .setPlaceholder('Select the type of ban')
        .addOptions([
        {
            label: 'ScreenShare Ban (False Ban)',
            description: 'Appeal a screenshare ban (false ban)',
            value: 'screenshare_false',
            emoji: '📹'
        },
        {
            label: 'ScreenShare Ban Appeal',
            description: 'Appeal a screenshare ban',
            value: 'screenshare_appeal',
            emoji: '📹'
        },
        {
            label: 'Strike that led to a Ban',
            description: 'Appeal a strike that led to a ban',
            value: 'strike_ban',
            emoji: '⚖️'
        },
        {
            label: 'Banned for being an alt',
            description: 'Appeal for being banned as an alt',
            value: 'banned_alt',
            emoji: '🤖'
        }
    ]);
    const row = new ActionRowBuilder().addComponents(selectMenu);
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Choose Ban Type')
        .setDescription('Select the type of ban you wish to appeal.');
    await interaction.update({ embeds: [embed], components: [row] });
}
