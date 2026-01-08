import { DynamicStyleSheet } from 'react-native-dark-mode';

import { ResponsiveUtils, ThemeUtils } from '@common';

export const styles = new DynamicStyleSheet({
  container: {
    flex: 1,
    paddingHorizontal: ResponsiveUtils.normalize(16),
    backgroundColor: ThemeUtils.getDynamicValue('backgroundColor'),
  },
  headWrapper: {
    marginTop: ResponsiveUtils.normalize(28),
    marginBottom: ResponsiveUtils.normalize(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchContainer: {
    width: ResponsiveUtils.normalize(600),
  },
  btnAddNew: {
    width: ResponsiveUtils.normalize(160),
    marginLeft: ResponsiveUtils.normalize(16),
    backgroundColor: ThemeUtils.getDynamicValue('primaryColor'),
    borderRadius: 4,
    alignItems: 'center',
  },
  lbAddNew: {
    fontSize: ResponsiveUtils.normalize(16),
    paddingVertical: ResponsiveUtils.normalize(12),
    color: '#FFF',
    ...ThemeUtils.fontMaker({ weight: '700' }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icLoadingMore: {
    alignItems: 'center',
    paddingVertical: 10,
  }
});
