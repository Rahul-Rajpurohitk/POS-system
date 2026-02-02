/**
 * DeliveryMap - Web-specific implementation using Leaflet
 *
 * This file provides interactive map functionality for web browsers
 * using Leaflet (no WebWorker issues).
 */

import React from 'react';
import { LeafletMap } from './LeafletMap.web';
import type { DeliveryMapProps } from './DeliveryMap';

export type { DeliveryMapProps, Coordinate, MapMarker, RouteSegment } from './DeliveryMap';

export function DeliveryMap(props: DeliveryMapProps) {
  return <LeafletMap {...props} showControls={true} enableFullscreen={true} />;
}

export default DeliveryMap;
