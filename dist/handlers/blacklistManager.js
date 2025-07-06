import cron from 'node-cron';
import prisma from '../utils/database.js';
export function startBlacklistManager() {
    cron.schedule('*/30 * * * * *', async () => {
        const now = new Date();
        const expired = await prisma.ticketBlacklist.findMany({
            where: { expiresAt: { not: null, lt: now } }
        });
        for (const entry of expired) {
            await prisma.ticketBlacklist.delete({ where: { id: entry.id } });
        }
    });
}
