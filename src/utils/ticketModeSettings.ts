// ticketModeSettings.ts
export enum TicketMode {
    CHANNEL_BASED = "channel",
    THREAD_BASED = "thread",
  }
  
  let currentTicketMode: TicketMode = TicketMode.CHANNEL_BASED;
  let pingRolesOnThread: boolean = false;
  
  /**
   * Sets the ticket mode and whether to ping roles for thread-based tickets.
   */
  export function setTicketMode(mode: TicketMode, pingRoles: boolean): void {
    currentTicketMode = mode;
    pingRolesOnThread = pingRoles;
  }
  
  /**
   * Returns the current ticket mode.
   */
  export function getTicketMode(): TicketMode {
    return currentTicketMode;
  }
  
  /**
   * Returns whether role ping is enabled for thread-based tickets.
   */
  export function shouldPingRoles(): boolean {
    return pingRolesOnThread;
  }
  