export { OrderWorker } from './OrderWorker';
export { InventoryWorker } from './InventoryWorker';
export { ReportWorker } from './ReportWorker';
export { NotificationWorker } from './NotificationWorker';
export { AnalyticsWorker } from './AnalyticsWorker';

import { OrderWorker } from './OrderWorker';
import { InventoryWorker } from './InventoryWorker';
import { ReportWorker } from './ReportWorker';
import { NotificationWorker } from './NotificationWorker';
import { AnalyticsWorker } from './AnalyticsWorker';

/**
 * Initialize all workers
 */
export async function initializeWorkers(): Promise<void> {
  console.log('Initializing queue workers...');

  await OrderWorker.initialize();
  await InventoryWorker.initialize();
  await ReportWorker.initialize();
  await NotificationWorker.initialize();
  await AnalyticsWorker.initialize();

  console.log('All queue workers initialized');
}
