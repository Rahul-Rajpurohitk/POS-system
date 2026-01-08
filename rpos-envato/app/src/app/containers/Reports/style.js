import { DynamicStyleSheet } from 'react-native-dark-mode';

import { ResponsiveUtils, ThemeUtils, Colors } from '@common';

export const styles = new DynamicStyleSheet({
  container: {
    flex: 1,
    paddingHorizontal: ResponsiveUtils.normalize(16),
    paddingTop: ResponsiveUtils.normalize(24),
    backgroundColor: ThemeUtils.getDynamicValue('backgroundColor'),
  },
  header: {
    flexDirection: 'row',
    marginBottom: ResponsiveUtils.normalize(30),
  },
  tableContainer: {
    flex: 1,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabContainer: {
    marginRight: ResponsiveUtils.normalize(12),
    paddingVertical: ResponsiveUtils.normalize(10),
    paddingHorizontal: ResponsiveUtils.normalize(15),
    borderRadius: ResponsiveUtils.normalize(4),
  },
  tabContainerActive: {
    backgroundColor: Colors.primaryColor.light,
  },
  tabLabel: {
    fontSize: ResponsiveUtils.normalize(18),
    color: '#AEABAB',
    ...ThemeUtils.fontMaker({ weight: '400' }),
  },
  tabLabelActive: {
    color: '#FFF',
  },
  btnExport: {
    padding: 10,
    backgroundColor: ThemeUtils.getDynamicValue('containerBgColor'),
    borderRadius: ResponsiveUtils.normalize(4),
  },
  lbExport: {
    fontSize: ResponsiveUtils.normalize(16),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({ weight: '400' }),
  },
  loadingContainer: {
    justifyContent: 'center',
  }
});
