import { OverwriteType, PermissionFlagsBits } from 'discord.js';
import config from '../config/config.js';
export function getPermissionOverwrites(guild, userId, ticketType) {
    const overwrites = [
        {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
            type: OverwriteType.Role
        },
        {
            id: userId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            type: OverwriteType.Member
        }
    ];
    if (ticketType === 'General') {
        // Allow staff to view and send messages.
        overwrites.push({
            id: config.staffRoleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            type: OverwriteType.Role
        });
    }
    else if (ticketType === 'Store') {
        // Only allow admins for store tickets.
        overwrites.push({
            id: config.adminRoleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            type: OverwriteType.Role
        });
    }
    else if (['Staff Report', 'Partnership'].includes(ticketType)) {
        // Restrict access by denying these roles.
        overwrites.push({
            id: config.adminRoleId,
            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            type: OverwriteType.Role
        });
    }
    else if (ticketType.endsWith('Appeal')) {
        // For any appeal ticket (Mute Appeal, Strike Appeal, Ban Appeal, etc.)
        // Deny staff role and allow admin role.
        overwrites.push({
            id: config.staffRoleId,
            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            type: OverwriteType.Role
        }, {
            id: config.adminRoleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            type: OverwriteType.Role
        });
    }
    return overwrites;
}
export function getCategoryId(ticketType, isArchived = false) {
    const categoryMapping = {
        'General': isArchived ? config.archivedGeneralTicketsCategoryId : config.generalTicketsCategoryId,
        'Appeal': isArchived ? config.archivedAppealTicketsCategoryId : config.appealTicketsCategoryId,
        'Staff Report': isArchived ? config.archivedStaffReportTicketsCategoryId : config.staffReportTicketsCategoryId,
        'Partnership': isArchived ? config.archivedPartnershipTicketsCategoryId : config.partnershipTicketsCategoryId,
        'Store': isArchived ? config.archivedStoreTicketsCategoryId : config.storeTicketsCategoryId,
    };
    return (categoryMapping[ticketType] ??
        (isArchived ? config.archivedTicketsCategoryId : config.ticketsCategoryId));
}
