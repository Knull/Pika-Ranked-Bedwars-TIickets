import prisma from '../utils/database.js';
import { RoleSelectCache } from '../utils/roleSelectCache.js';
export async function confirmTicketConfigPermissions(interaction) {
    const ticketType = interaction.customId.replace('confirm_permissions_', '');
    const cacheKey = `${interaction.user.id}_${ticketType}`;
    const selectedRoleIds = RoleSelectCache.get(cacheKey);
    if (!selectedRoleIds || selectedRoleIds.length === 0) {
        await interaction.update({ content: `Permissions for ${ticketType} tickets have been updated.`, components: [] });
        return;
    }
    try {
        await prisma.ticketConfig.upsert({
            where: { ticketType },
            update: { permissions: selectedRoleIds },
            create: {
                ticketType,
                permissions: selectedRoleIds,
                allowCustomInstructions: false,
                useCustomInstructions: false,
                instructions: "",
                previewTitle: ""
            }
        });
        RoleSelectCache.delete(cacheKey);
        await interaction.update({ content: `Permissions for ${ticketType} tickets have been updated.`, embeds: [], components: [] });
    }
    catch (error) {
        await interaction.update({ content: 'There was an error updating the permissions.', components: [] });
    }
}
export async function cancelTicketConfigPermissions(interaction) {
    const ticketType = interaction.customId.replace('cancel_permissions_', '');
    const cacheKey = `${interaction.user.id}_${ticketType}`;
    RoleSelectCache.delete(cacheKey);
    await interaction.update({ content: `Permissions update for ${ticketType} tickets has been cancelled.`, components: [] });
}
