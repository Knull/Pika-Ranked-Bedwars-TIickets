import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { handleTicketToggleCommand } from "../handlers/ticketToggle.js";

const data = new SlashCommandBuilder()
  .setName("ticket-toggle")
  .setDescription("Toggle the ticketing mode (thread-based or channel-based)")
  .addStringOption(option =>
    option
      .setName("mode")
      .setDescription("Select ticketing mode")
      .setRequired(true)
      .addChoices(
        { name: "thread", value: "thread" },
        { name: "channel", value: "channel" }
      )
  );

async function execute(interaction: ChatInputCommandInteraction) {
  await handleTicketToggleCommand(interaction);
}

export default { data, execute };
