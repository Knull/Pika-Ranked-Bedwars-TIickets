// ticketModeSettings.ts
export var TicketMode;
(function (TicketMode) {
    TicketMode["CHANNEL_BASED"] = "channel";
    TicketMode["THREAD_BASED"] = "thread";
})(TicketMode || (TicketMode = {}));
let currentTicketMode = TicketMode.CHANNEL_BASED;
let pingRolesOnThread = false;
/**
 * Sets the ticket mode and whether to ping roles for thread-based tickets.
 */
export function setTicketMode(mode, pingRoles) {
    currentTicketMode = mode;
    pingRolesOnThread = pingRoles;
}
/**
 * Returns the current ticket mode.
 */
export function getTicketMode() {
    return currentTicketMode;
}
/**
 * Returns whether role ping is enabled for thread-based tickets.
 */
export function shouldPingRoles() {
    return pingRolesOnThread;
}
