export async function handleCommand(interaction, client) {
    if (interaction.commandName === 'add') {
        const { handleAddCommand } = await import('../handlers/ticketHandlers.js');
        await handleAddCommand(interaction);
    }
    // Other commands (close, claim, remove, etc.) can be handled here.
}
export function registerCommands(client) {
    // Optionally register slash commands with Discord if needed.
}
