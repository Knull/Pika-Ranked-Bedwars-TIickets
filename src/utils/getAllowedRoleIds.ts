import prisma from './database.js';

/**
 * Fetches allowed role IDs from all TicketConfig entries.
 * If you want a different filter (for example, only admin roles),
 * adjust the query accordingly.
 */
export async function getAllowedRoleIds(): Promise<string[]> {
  const configs = await prisma.ticketConfig.findMany();
  const roleSet = new Set<string>();
  for (const config of configs) {
    if (config.permissions && Array.isArray(config.permissions)) {
      const roles = config.permissions as string[];
      roles.forEach((roleId: string) => roleSet.add(roleId));
    }
  }
  return Array.from(roleSet);
}
