export { usePlatform, useProductGridColumns } from './usePlatform';
export type { PlatformInfo } from './usePlatform';

export { useWebSocket, useAnalyticsRealtime, RealtimeEvent } from './useWebSocket';
export type {
  UseWebSocketOptions,
  RealtimePayload,
  AnalyticsUpdatePayload,
  AnalyticsMetricsPayload,
  ConnectionStatus,
} from './useWebSocket';

export { useReports } from './useReports';

export {
  useLocationTracking,
  calculateDistance,
  formatDistance,
  formatDuration,
} from './useLocationTracking';
export type {
  LocationTrackingConfig,
  UseLocationTrackingResult,
} from './useLocationTracking';

export { usePdfDownload } from './usePdfDownload';
export type { PdfType, UsePdfDownloadResult } from './usePdfDownload';
