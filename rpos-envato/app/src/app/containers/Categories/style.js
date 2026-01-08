import { DynamicStyleSheet } from 'react-native-dark-mode';

import { ResponsiveUtils, ThemeUtils } from '@common';

export const styles = new DynamicStyleSheet({
  container: {
    flex: 1,
    paddingHorizontal: ResponsiveUtils.normalize(23),
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
    width: ResponsiveUtils.normalize(626),
  },
  btnAddNew: {
    backgroundColor: ThemeUtils.getDynamicValue('primaryColor'),
    borderRadius: 4,
  },
  lbAddNew: {
    fontSize: ResponsiveUtils.normalize(16),
    paddingHorizontal: ResponsiveUtils.normalize(50),
    paddingVertical: ResponsiveUtils.normalize(12),
    color: '#FFF',
    ...ThemeUtils.fontMaker({ weight: '700' }),
  },
  icLoadingMore: {
    alignItems: 'center',
    paddingVertical: 10,
  },
});
