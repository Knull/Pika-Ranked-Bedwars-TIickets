import { ButtonInteraction, Client, PermissionFlagsBits, OverwriteType, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } from 'discord.js';
import prisma from '../utils/database.js';
import { showPartnershipModal } from '../modals/partnershipModal.js';
import { handleCreateGeneralTicket } from '../handlers/createTicketHandlers.js';
import { createTicketChannel } from '../handlers/ticketHandlers.js';
import { showInitialAppealDropdown } from '../dropdowns/appealDropdown.js';
import winston from 'winston';
import { instructionsCache } from '../utils/instructionsCache.js';
import { getPermissionOverwrites } from '../utils/discordUtils.js';
import { confirmTicketConfigPermissions, cancelTicketConfigPermissions } from '../handlers/ticketPermissionHandlers.js'
import { handleCloseTicket, handleReopenTicket, handleClaimTicket, handleDeleteTicketManual, handleDeleteTicketAuto, handleAdvancedTicketLog } from '../handlers/ticketHandlers.js';
import config from '../config/config.js';
const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});
import { RoleSelectCache } from '../utils/roleSelectCache.js';

async function checkTicketLimit(interaction: ButtonInteraction): Promise<boolean> {
  try {
    const openTickets = await prisma.ticket.findMany({ where: { userId: interaction.user.id, status: 'open' } });
    console.log(`User ${interaction.user.id} has ${openTickets.length} open tickets.`);
    if (openTickets.length >= 2) {
      try {
        // We use followUp because the interaction is already deferred.
        await interaction.followUp({ 
          content: 'You already have 2 open tickets. Please continue in one of your existing ticket channels.',
          flags: 64
        });
      } catch (replyError) {
        console.error('Error replying in checkTicketLimit:', replyError);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking ticket limit:', error);
    return true; // fail safe
  }
}

export const ButtonHandlerRegistry: { [key: string]: (interaction: ButtonInteraction, client: any) => Promise<void> } = {
  // General ticket creation button
  'create_general': async (interaction, client) => {
  logger.info(`Handling create_general button`);
  try {
    // Immediately check how many open tickets the user has.
    const openTickets = await prisma.ticket.findMany({ 
      where: { userId: interaction.user.id, status: 'open' } 
    });
    console.log(`User ${interaction.user.id} has ${openTickets.length} open tickets.`);
    if (openTickets.length >= 2) {
      // If 2 or more tickets exist, reply with an error.
      await interaction.reply({ 
        content: 'You already have 2 open tickets. Please continue in one of your existing ticket channels.',
        flags: 64  // ephemeral flag
      });
      return;
    }
    // Otherwise, show the modal immediately.
    await handleCreateGeneralTicket(interaction, client);
  } catch (error) {
    console.error('Error checking ticket limit in create_general:', error);
    try {
      await interaction.reply({ 
        content: 'There was an error checking your ticket limit. Please try again later.',
        flags: 64
      });
    } catch (err) {
      console.error('Error sending error reply:', err);
    }
  }
},

'create_appeal': async (interaction, client) => {
    logger.info(`Handling create_appeal button`);
    try {
      await interaction.deferReply({ flags: 64 });
    } catch (err) {
      console.error("Error deferring interaction in create_appeal handler:", err);
      return;
    }
    if (await checkTicketLimit(interaction)) return;
    try {
      await showInitialAppealDropdown(interaction, true);
    } catch (err) {
      console.error("Error showing appeal dropdown:", err);
    }
  },
  
  // Store ticket creation button
  'create_store': async (interaction, client) => {
    logger.info(`Handling create_store button`);
    try {
      await interaction.deferReply({ flags: 64 });
    } catch (err) {
      console.error("Error deferring interaction in create_store handler:", err);
      return;
    }
    const openTickets = await prisma.ticket.findMany({ where: { userId: interaction.user.id, status: 'open' } });
    console.log(`User ${interaction.user.id} has ${openTickets.length} open tickets.`);
    if (openTickets.length >= 2) {
      try {
        await interaction.followUp({ 
          content: 'You already have 2 open tickets. Please continue in one of your existing ticket channels.',
          flags: 64
        });
      } catch (e) {
        console.error('Error replying ticket limit for store:', e);
      }
      return;
    }
    try {
      const data = { 
        title: 'Store Purchase', 
        description: "Once you're done selecting a product, please describe your payment method and any questions you have."
      };
      const ticketChannel = await createTicketChannel(interaction, 'Store', data, false);
      await interaction.followUp({ 
        content: `Your ticket has been opened. Head over to <#${ticketChannel.id}> to continue.`,
        flags: 64
      });
    } catch (e) {
      console.error('Error creating store ticket:', e);
      try {
        await interaction.followUp({ content: 'Failed to create store ticket. Please try again later.', flags: 64 });
      } catch (err) {
        console.error('Error editing store ticket reply:', err);
      }
    }
  },

  // Partnership ticket creation button
  'create_partnership': async (interaction, client) => {
  logger.info(`Handling create_partnership button`);
  try {
    // Check the ticket limit immediately.
    const openTickets = await prisma.ticket.findMany({ 
      where: { userId: interaction.user.id, status: 'open' } 
    });
    console.log(`User ${interaction.user.id} has ${openTickets.length} open tickets.`);
    if (openTickets.length >= 2) {
      await interaction.reply({ 
        content: 'You already have 2 open tickets. Please continue in one of your existing ticket channels.',
        flags: 64
      });
      return;
    }
    // If under limit, immediately show the partnership modal.
    await showPartnershipModal(interaction);
  } catch (error) {
    console.error('Error in create_partnership button handler:', error);
    try {
      await interaction.reply({ 
        content: 'There was an error checking your ticket limit. Please try again later.',
        flags: 64
      });
    } catch (err) {
      console.error('Error replying to create_partnership error:', err);
    }
  }
},

  
  // Other handlers such as 'close_ticket', 'claim_ticket', etc.
  'close_ticket': async (interaction, client) => {
    await handleCloseTicket(interaction);
  },

  'delete_ticket_manual': async (interaction, client) => {
    const memberRoles = interaction.member?.roles;
    let hasStaff = false;
    if (Array.isArray(memberRoles)) {
      hasStaff = memberRoles.includes(config.staffRoleId);
    } else if (memberRoles && 'cache' in memberRoles) {
      hasStaff = memberRoles.cache.has(config.staffRoleId);
    }
    if (!hasStaff) {
      await interaction.reply({ content: 'You are not authorized to delete tickets.', ephemeral: true });
      return;
    }
    const modal = new ModalBuilder()
      .setCustomId('delete_ticket_manual')
      .setTitle('Delete Ticket Reason');
    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Please provide a reason:')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
    await interaction.showModal(modal);
  },
  'claim_ticket': async (interaction, client) => {
    const memberRoles = interaction.member?.roles;
    let hasStaff = false;
    if (Array.isArray(memberRoles)) {
      hasStaff = memberRoles.includes(config.staffRoleId);
    } else if (memberRoles && 'cache' in memberRoles) {
      hasStaff = memberRoles.cache.has(config.staffRoleId);
    }
    if (!hasStaff) {
      await interaction.reply({ content: 'You are not d to claim tickets.', ephemeral: true });
      return;
    }
    const modal = new ModalBuilder()
      .setCustomId('claim_ticket')
      .setTitle('Claim Ticket Reason');
    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Please provide a reason:')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
    await interaction.showModal(modal);
  },
  'delete_ticket_auto': async (interaction, client) => {
    await handleDeleteTicketAuto(interaction);
  },
  'confirm_instructions_': async (interaction: ButtonInteraction, client: Client) => {
    const ticketType = interaction.customId.replace('confirm_instructions_', '');
    const cacheKey = `${interaction.user.id}_${ticketType}`;
    const cached = instructionsCache.get(cacheKey);
    
    if (!cached) {
      // Fallback: if cache not found, attempt to extract from embed.
      const embed = interaction.message.embeds[0];
      const newPreviewTitle = embed.title || `${ticketType} Ticket Preview`;
      const newInstructions = embed.description ? embed.description.replace(/```/g, '').trim() : '';
      instructionsCache.set(cacheKey, { instructions: newInstructions, previewTitle: newPreviewTitle });
    }

    const { instructions, previewTitle } = instructionsCache.get(cacheKey)!;

    try {
      await prisma.ticketConfig.upsert({
        where: { ticketType },
        update: { instructions, previewTitle, useCustomInstructions: true },
        create: { 
          ticketType, 
          instructions, 
          previewTitle, 
          useCustomInstructions: true,
          allowCustomInstructions: true // Ensure allowed types are updated.
        },
      });
      // Remove the cache entry upon successful update.
      instructionsCache.delete(cacheKey);
      await interaction.update({
        content: `Custom instructions for ${ticketType} tickets have been updated.`,
        embeds: [],
        components: []
      });
    } catch (error) {
      logger.error('Error updating custom instructions:', error);
      await interaction.update({
        content: 'There was an error updating the custom instructions.',
        embeds: [],
        components: []
      });
    }
  },

  // Cancel custom instructions update handler.
  'cancel_instructions_': async (interaction: ButtonInteraction, client: Client) => {
    const ticketType = interaction.customId.replace('cancel_instructions_', '');
    const cacheKey = `${interaction.user.id}_${ticketType}`;
    // Remove cached data since the update is cancelled.
    instructionsCache.delete(cacheKey);
    await interaction.update({
      content: `Operation cancelled. Custom instructions for ${ticketType} tickets were not updated.`,
      embeds: [],
      components: []
    });
  },
  'confirm_permissions_': confirmTicketConfigPermissions,
  'cancel_permissions_': cancelTicketConfigPermissions,
  'advanced_ticketLog': async (interaction, client) => {
    await handleAdvancedTicketLog(interaction);
  },
  'reopen_ticket' : handleReopenTicket,
};
