import { DynamicStyleSheet } from 'react-native-dark-mode';
import { Dimensions } from 'react-native';

import { ResponsiveUtils, ThemeUtils } from '@common';

const { width: screensWidth } = Dimensions.get('window');

export const styles = new DynamicStyleSheet({
  container: {
    flex: 1,
    paddingHorizontal: ResponsiveUtils.normalize(23),
    backgroundColor: ThemeUtils.getDynamicValue('backgroundColor'),
  },
  mainContainer: {
    marginTop: 20,
  },
  quickLinks: {
    flexDirection: 'row',
    marginTop: 28,
  },
  quickLinkItem: {
    flex: 1,
    marginLeft: ResponsiveUtils.normalize(14),
    paddingTop: 8,
    paddingBottom: 11,
    borderRadius: 3,
    backgroundColor: ThemeUtils.getDynamicValue('containerBgColor'),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  qickLinkIcon: {
    width: ResponsiveUtils.normalize(35),
    height: ResponsiveUtils.normalize(35),
    resizeMode: 'contain',
    marginBottom: 7,
  },
  qickLinkText: {
    fontSize: ResponsiveUtils.normalize(9),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({ weight: '500' }),
  },
  chartContainer: {
    paddingLeft: ResponsiveUtils.normalize(30),
    marginBottom: ResponsiveUtils.normalize(16),
    backgroundColor: ThemeUtils.getDynamicValue('containerBgColor'),
    borderRadius: 6,
  },
  chartName: {
    marginTop: 27,
    marginBottom: 23,
    fontSize: ResponsiveUtils.normalize(18),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({ weight: '700' }),
  },
  chartEmptyContainer: {
    width: screensWidth - 100,
    height: ResponsiveUtils.normalize(300),
    alignItems: 'center',
    justifyContent: 'center',
  },
  lbChartError: {
    fontSize: ResponsiveUtils.normalize(18),
  }
});
