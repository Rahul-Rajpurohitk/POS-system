export { OrderWorker } from './OrderWorker';
export { InventoryWorker } from './InventoryWorker';
export { ReportWorker } from './ReportWorker';
export { NotificationWorker } from './NotificationWorker';

import { OrderWorker } from './OrderWorker';
import { InventoryWorker } from './InventoryWorker';
import { ReportWorker } from './ReportWorker';
import { NotificationWorker } from './NotificationWorker';

/**
 * Initialize all workers
 */
export async function initializeWorkers(): Promise<void> {
  console.log('Initializing queue workers...');

  await OrderWorker.initialize();
  await InventoryWorker.initialize();
  await ReportWorker.initialize();
  await NotificationWorker.initialize();

  console.log('All queue workers initialized');
}
