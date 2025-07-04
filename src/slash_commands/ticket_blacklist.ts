import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import prisma from '../utils/database.js';
import config from '../config/config.js';

function parseDuration(str: string): number | null {
  const match = str.match(/^(\d+)([smhdw])$/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'w':
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

const data = new SlashCommandBuilder()
  .setName('ticket_blacklist')
  .setDescription('Prevent a user from opening tickets')
  .addUserOption(opt =>
    opt.setName('user').setDescription('User to blacklist').setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('duration').setDescription('Duration (e.g. 1d, 2h). Optional')
  );

async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member;
  if (!member) {
    await interaction.reply({ content: `Only <@&${config.adminRoleId}> can use this command.`, ephemeral: true });
    return;
  }
  const roles = (member as any).roles;
  if (!('cache' in roles)) {
    await interaction.reply({ content: `Only <@&${config.adminRoleId}> can use this command.`, ephemeral: true });
    return;
  }
  if (!roles.cache.has(config.adminRoleId)) {
    await interaction.reply({ content: `Only <@&${config.adminRoleId}> can use this command.`, ephemeral: true });
    return;
  }

  const target = interaction.options.getUser('user', true);
  const durationStr = interaction.options.getString('duration');
  let expiresAt: Date | null = null;
  if (durationStr) {
    const ms = parseDuration(durationStr);
    if (ms !== null) {
      expiresAt = new Date(Date.now() + ms);
    }
  }

  await prisma.ticketBlacklist.upsert({
    where: { userId: target.id },
    update: { expiresAt },
    create: { userId: target.id, expiresAt }
  });

  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setDescription(`> Blacklisted <@${target.id}> from opening any tickets`);
  await interaction.reply({ embeds: [embed] });
}

export default { data, execute };
