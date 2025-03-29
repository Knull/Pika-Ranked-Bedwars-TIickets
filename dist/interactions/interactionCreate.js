export async function registerInteractions(client, interaction) {
    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
        if (client.commands) {
            const command = client.commands.get(interaction.commandName);
            if (command && typeof command.autocomplete === 'function') {
                await command.autocomplete(interaction);
            }
            else {
                console.warn(`No autocomplete handler for ${interaction.commandName}`);
            }
        }
        else {
            console.warn("Client does not have a 'commands' property for autocomplete handling.");
        }
        return;
    }
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        if (client.commands) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                console.warn(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            try {
                await command.execute(interaction);
            }
            catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
                }
                else {
                    await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
                }
            }
        }
        else {
            console.warn("Client does not have a 'commands' property for command handling.");
        }
        return;
    }
    // Handle buttons
    if (interaction.isButton()) {
        const { ButtonHandlerRegistry } = await import('../registries/ButtonHandlerRegistry.js');
        const handlerKey = Object.keys(ButtonHandlerRegistry).find(prefix => interaction.customId.startsWith(prefix));
        if (handlerKey) {
            await ButtonHandlerRegistry[handlerKey](interaction, client);
        }
        else {
            console.warn(`Unhandled button interaction: ${interaction.customId}`);
        }
        return;
    }
    if (interaction.isModalSubmit()) {
        const { modalRegistry } = await import('../registries/ModalHandlerRegistry.js');
        const handlerKey = Object.keys(modalRegistry).find(prefix => interaction.customId.startsWith(prefix));
        if (handlerKey) {
            await modalRegistry[handlerKey](interaction);
        }
        else {
            console.warn(`Unhandled modal interaction: ${interaction.customId}`);
        }
        return;
    }
    // Handle role select menus
    if (interaction.isRoleSelectMenu()) {
        const { RoleSelectHandlers } = await import('../registries/DropdownHandlerRegistry.js');
        const handlerKey = Object.keys(RoleSelectHandlers).find(prefix => interaction.customId.startsWith(prefix));
        if (handlerKey) {
            await RoleSelectHandlers[handlerKey](interaction);
        }
        else {
            console.warn(`Unhandled role select interaction: ${interaction.customId}`);
        }
        return;
    }
    // Handle string select menus
    if (interaction.isStringSelectMenu()) {
        const { StringSelectHandlers } = await import('../registries/DropdownHandlerRegistry.js');
        const handlerKey = Object.keys(StringSelectHandlers).find(prefix => interaction.customId.startsWith(prefix));
        if (handlerKey) {
            await StringSelectHandlers[handlerKey](interaction);
        }
        else {
            console.warn(`Unhandled string select interaction: ${interaction.customId}`);
        }
        return;
    }
}
