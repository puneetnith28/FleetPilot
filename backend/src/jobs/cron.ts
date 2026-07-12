import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { createNotification } from '../utils/notifications';

const prisma = new PrismaClient();

// This cron job checks for expiring driver licenses and simulates sending an email reminder.
export const startCronJobs = () => {
  // Run every day at 08:00 AM (server time). For hackathon demo, we could run it more frequently,
  // but let's stick to a daily schedule and run it once on startup for demonstration.
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running daily license expiry check...');
    await checkExpiringLicenses();
  });

  // Also run immediately on startup for the hackathon demo purposes
  setTimeout(() => {
    console.log('[CRON] Running initial license expiry check on startup...');
    checkExpiringLicenses();
  }, 5000); // delay 5 seconds to ensure DB is connected and server is ready
};

const checkExpiringLicenses = async () => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const drivers = await prisma.driver.findMany({
      where: {
        licenseExpiryDate: {
          lte: thirtyDaysFromNow,
          gt: new Date(), // ignore already expired ones if we only want to warn about *expiring*
        },
      },
    });

    if (drivers.length === 0) {
      console.log('[CRON] No drivers have licenses expiring in the next 30 days.');
      return;
    }

    for (const driver of drivers) {
      const daysLeft = Math.ceil((driver.licenseExpiryDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      
      // Simulate Email Sending
      console.log(`[EMAIL SIMULATION] To: ${driver.name.replace(' ', '.').toLowerCase()}@fleetpilot.local`);
      console.log(`[EMAIL SIMULATION] Subject: URGENT: Driver License Expiring Soon`);
      console.log(`[EMAIL SIMULATION] Body: Dear ${driver.name}, your license (${driver.licenseNumber}) is expiring in ${daysLeft} days on ${driver.licenseExpiryDate.toDateString()}. Please renew it immediately to avoid suspension.`);

      // Create in-app notification for Fleet Manager
      await createNotification(
        'License Expiring Soon',
        `Driver ${driver.name} has a license expiring in ${daysLeft} days.`,
        'WARNING'
      );
    }
  } catch (error) {
    console.error('[CRON] Error checking expiring licenses:', error);
  }
};
