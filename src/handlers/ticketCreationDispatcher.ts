// src/handlers/ticketCreationDispatcher.ts
import { getTicketMode, TicketMode } from '../utils/ticketModeSettings.js';
import { createTicketChannel } from './ticketHandlers.js';
import { createTicketThread } from './threadTicketHandlers.js';

/**
 * Creates a ticket using the current mode.
 * If the mode is THREAD_BASED, it routes to createTicketThread;
 * otherwise, it calls createTicketChannel.
 *
 * @param interaction - The interaction object triggering ticket creation.
 * @param ticketType - The type of ticket (e.g., 'General', 'Store').
 * @param data - Object with title, description (and optional banType).
 * @param shouldDefer - Whether to defer the reply.
 * @returns The created ticket channel or thread.
 */
export async function createTicket(
  interaction: any,
  ticketType: string,
  data: { title: string; description: string; banType?: string },
  shouldDefer: boolean = true
) {
  if (getTicketMode() === TicketMode.THREAD_BASED) {
    return await createTicketThread(interaction, ticketType, data, shouldDefer);
  } else {
    return await createTicketChannel(interaction, ticketType, data, shouldDefer);
  }
}
