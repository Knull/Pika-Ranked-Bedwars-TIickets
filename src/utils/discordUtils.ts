import { Guild, OverwriteData, OverwriteType, PermissionFlagsBits } from 'discord.js';
import config from '../config/config.js';

function toBigInt(value: any): bigint {
  return typeof value === 'bigint' ? value : BigInt(value);
}

export function getPermissionOverwrites(
  guild: Guild,
  userId: string,
  ticketType: string
): OverwriteData[] {
  const everyoneRole = guild.roles.cache.get(guild.roles.everyone.id);
  if (!everyoneRole) {
    throw new Error("Everyone role not found");
  }

  const defaults: OverwriteData[] = [
    {
      id: everyoneRole.id,
      deny: [toBigInt(PermissionFlagsBits.ViewChannel)],
      type: OverwriteType.Role,
    },
    {
      id: userId,
      allow: [
        toBigInt(PermissionFlagsBits.ViewChannel),
        toBigInt(PermissionFlagsBits.SendMessages)
      ],
      type: OverwriteType.Member,
    },
  ];

  if (ticketType === 'General') {
    const staffRole = guild.roles.cache.get(config.staffRoleId);
    if (staffRole) {
      defaults.push({
        id: staffRole.id,
        allow: [
          toBigInt(PermissionFlagsBits.ViewChannel),
          toBigInt(PermissionFlagsBits.SendMessages)
        ],
        type: OverwriteType.Role,
      });
    }
  } else if (ticketType === 'Store') {
    const adminRole = guild.roles.cache.get(config.adminRoleId);
    if (adminRole) {
      defaults.push({
        id: adminRole.id,
        allow: [
          toBigInt(PermissionFlagsBits.ViewChannel),
          toBigInt(PermissionFlagsBits.SendMessages)
        ],
        type: OverwriteType.Role,
      });
    }
  } else if (['Staff Report', 'Partnership'].includes(ticketType)) {
    const adminRole = guild.roles.cache.get(config.adminRoleId);
    if (adminRole) {
      defaults.push({
        id: adminRole.id,
        deny: [
          toBigInt(PermissionFlagsBits.ViewChannel),
          toBigInt(PermissionFlagsBits.SendMessages)
        ],
        type: OverwriteType.Role,
      });
    }
  } else if (ticketType.endsWith('Appeal')) {
    const staffRole = guild.roles.cache.get(config.staffRoleId);
    const adminRole = guild.roles.cache.get(config.adminRoleId);
    if (staffRole) {
      defaults.push({
        id: staffRole.id,
        deny: [
          toBigInt(PermissionFlagsBits.ViewChannel),
          toBigInt(PermissionFlagsBits.SendMessages)
        ],
        type: OverwriteType.Role,
      });
    }
    if (adminRole) {
      defaults.push({
        id: adminRole.id,
        allow: [
          toBigInt(PermissionFlagsBits.ViewChannel),
          toBigInt(PermissionFlagsBits.SendMessages)
        ],
        type: OverwriteType.Role,
      });
    }
  }
  return defaults;
}


export async function getPermissionOverwritesAsync(
  guild: Guild,
  userId: string,
  ticketType: string
): Promise<OverwriteData[]> {
  // Ensure the everyone role is available, converting null to undefined
  let everyoneRole =
    guild.roles.cache.get(guild.roles.everyone.id) ??
    (await guild.roles.fetch(guild.roles.everyone.id)) ??
    undefined;

  if (!everyoneRole) {
    throw new Error("Everyone role not found");
  }

  const defaults: OverwriteData[] = [
    {
      id: everyoneRole.id,
      deny: [toBigInt(PermissionFlagsBits.ViewChannel)],
      type: OverwriteType.Role,
    },
    {
      id: userId,
      allow: [
        toBigInt(PermissionFlagsBits.ViewChannel),
        toBigInt(PermissionFlagsBits.SendMessages)
      ],
      type: OverwriteType.Member,
    },
  ];

  if (ticketType === 'General') {
    const staffRole =
      guild.roles.cache.get(config.staffRoleId) ??
      (await guild.roles.fetch(config.staffRoleId)) ??
      undefined;
    if (staffRole) {
      defaults.push({
        id: staffRole.id,
        allow: [
          toBigInt(PermissionFlagsBits.ViewChannel),
          toBigInt(PermissionFlagsBits.SendMessages)
        ],
        type: OverwriteType.Role,
      });
    }
  } else if (ticketType === 'Store') {
    const adminRole =
      guild.roles.cache.get(config.adminRoleId) ??
      (await guild.roles.fetch(config.adminRoleId)) ??
      undefined;
    if (adminRole) {
      defaults.push({
        id: adminRole.id,
        allow: [
          toBigInt(PermissionFlagsBits.ViewChannel),
          toBigInt(PermissionFlagsBits.SendMessages)
        ],
        type: OverwriteType.Role,
      });
    }
  } else if (['Staff Report', 'Partnership'].includes(ticketType)) {
    const adminRole =
      guild.roles.cache.get(config.adminRoleId) ??
      (await guild.roles.fetch(config.adminRoleId)) ??
      undefined;
    if (adminRole) {
      defaults.push({
        id: adminRole.id,
        deny: [
          toBigInt(PermissionFlagsBits.ViewChannel),
          toBigInt(PermissionFlagsBits.SendMessages)
        ],
        type: OverwriteType.Role,
      });
    }
  } else if (ticketType.endsWith('Appeal')) {
    const staffRole =
      guild.roles.cache.get(config.staffRoleId) ??
      (await guild.roles.fetch(config.staffRoleId)) ??
      undefined;
    const adminRole =
      guild.roles.cache.get(config.adminRoleId) ??
      (await guild.roles.fetch(config.adminRoleId)) ??
      undefined;
    if (staffRole) {
      defaults.push({
        id: staffRole.id,
        deny: [
          toBigInt(PermissionFlagsBits.ViewChannel),
          toBigInt(PermissionFlagsBits.SendMessages)
        ],
        type: OverwriteType.Role,
      });
    }
    if (adminRole) {
      defaults.push({
        id: adminRole.id,
        allow: [
          toBigInt(PermissionFlagsBits.ViewChannel),
          toBigInt(PermissionFlagsBits.SendMessages)
        ],
        type: OverwriteType.Role,
      });
    }
  }
  return defaults;
}



export function getCategoryId(ticketType: string, isArchived = false): string {
  const categoryMapping: { [key: string]: string } = {
    'General': isArchived ? config.archivedGeneralTicketsCategoryId : config.generalTicketsCategoryId,
    'Appeal': isArchived ? config.archivedAppealTicketsCategoryId : config.appealTicketsCategoryId,
    'Staff Report': isArchived ? config.archivedStaffReportTicketsCategoryId : config.staffReportTicketsCategoryId,
    'Partnership': isArchived ? config.archivedPartnershipTicketsCategoryId : config.partnershipTicketsCategoryId,
    'Store': isArchived ? config.archivedStoreTicketsCategoryId : config.storeTicketsCategoryId,
  };

  return categoryMapping[ticketType] ?? (isArchived ? config.archivedTicketsCategoryId : config.ticketsCategoryId);
}
