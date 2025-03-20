import { 
  Client, 
  Interaction, 
  ChatInputCommandInteraction, 
  AutocompleteInteraction 
} from 'discord.js';
import { ExtendedClient } from '../types/ExtendedClient.js';

export async function registerInteractions(client: Client, interaction: Interaction) {
  // Handle autocomplete interactions
  if (interaction.isAutocomplete()) {
    // Check if the client has a commands collection
    if ((client as ExtendedClient).commands) {
      const command = (client as ExtendedClient).commands.get(interaction.commandName);
      if (command && typeof command.autocomplete === 'function') {
        await command.autocomplete(interaction as AutocompleteInteraction);
      } else {
        console.warn(`No autocomplete handler for ${interaction.commandName}`);
      }
    } else {
      console.warn("Client does not have a 'commands' property for autocomplete handling.");
    }
    return;
  }
  
  // Handle slash (chat input) commands
  if (interaction.isChatInputCommand()) {
    if ((client as ExtendedClient).commands) {
      const command = (client as ExtendedClient).commands.get(interaction.commandName);
      if (!command) {
        console.warn(`No command matching ${interaction.commandName} was found.`);
        return;
      }
      try {
        await command.execute(interaction as ChatInputCommandInteraction);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
        }
      }
    } else {
      console.warn("Client does not have a 'commands' property for command handling.");
    }
    return;
  }
  
  // Handle buttons
  if (interaction.isButton()) {
    const { ButtonHandlerRegistry } = await import('../registries/ButtonHandlerRegistry.js');
    const handlerKey = Object.keys(ButtonHandlerRegistry).find(prefix =>
      interaction.customId.startsWith(prefix)
    );
    if (handlerKey) {
      await ButtonHandlerRegistry[handlerKey](interaction, client);
    } else {
      console.warn(`Unhandled button interaction: ${interaction.customId}`);
    }
    return;
  }
  
  // Handle modals
  if (interaction.isModalSubmit()) {
    const { modalRegistry } = await import('../registries/ModalHandlerRegistry.js');
    const handlerKey = Object.keys(modalRegistry).find(prefix =>
      interaction.customId.startsWith(prefix)
    );
    if (handlerKey) {
      await modalRegistry[handlerKey](interaction);
    } else {
      console.warn(`Unhandled modal interaction: ${interaction.customId}`);
    }
    return;
  }
  
  // Handle select menus (dropdowns)
  if (interaction.isStringSelectMenu()) {
    const { DropdownHandlerRegistry } = await import('../registries/DropdownHandlerRegistry.js');
    const handlerKey = Object.keys(DropdownHandlerRegistry).find(prefix =>
      interaction.customId.startsWith(prefix)
    );
    if (handlerKey) {
      await DropdownHandlerRegistry[handlerKey](interaction);
    } else {
      console.warn(`Unhandled dropdown interaction: ${interaction.customId}`);
    }
    return;
  }
}
