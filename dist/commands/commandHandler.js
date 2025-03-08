export async function handleCommand(interaction, client) {
    if (interaction.commandName === 'add') {
        const { handleAddCommand } = await import('../handlers/ticketHandlers.js');
        await handleAddCommand(interaction);
    }
    // Other admin/management commands…
}
export function registerCommands(client) {
    // Register slash commands if desired.
}
