import { Client, Interaction } from 'discord.js';
import { ButtonHandlerRegistry } from '../registries/ButtonHandlerRegistry.js';
import { modalRegistry } from '../registries/ModalHandlerRegistry.js';
import { DropdownHandlerRegistry } from '../registries/DropdownHandlerRegistry.js';

export async function registerInteractions(client: Client, interaction: Interaction) {
  if (interaction.isButton()) {
    const handlerKey = Object.keys(ButtonHandlerRegistry).find(prefix =>
      interaction.customId.startsWith(prefix)
    );
    if (handlerKey) {
      await ButtonHandlerRegistry[handlerKey](interaction, client);
    } else {
      console.warn(`Unhandled button interaction: ${interaction.customId}`);
    }
  } else if (interaction.isModalSubmit()) {
    const handlerKey = Object.keys(modalRegistry).find(prefix =>
      interaction.customId.startsWith(prefix)
    );
    if (handlerKey) {
      await modalRegistry[handlerKey](interaction);
    } else {
      console.warn(`Unhandled modal interaction: ${interaction.customId}`);
    }
  } else if (interaction.isStringSelectMenu()) {
    const handlerKey = Object.keys(DropdownHandlerRegistry).find(prefix =>
      interaction.customId.startsWith(prefix)
    );
    if (handlerKey) {
      await DropdownHandlerRegistry[handlerKey](interaction);
    } else {
      console.warn(`Unhandled dropdown interaction: ${interaction.customId}`);
    }
  } else if (interaction.isCommand()) {
    const { handleCommand } = await import('../commands/commandHandler.js');
    await handleCommand(interaction, client);
  }
}
