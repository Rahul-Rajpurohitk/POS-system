import { DynamicStyleSheet } from 'react-native-dark-mode';

import { ResponsiveUtils, ThemeUtils, Colors } from '@common';

export const styles = new DynamicStyleSheet({
  container: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: ResponsiveUtils.normalize(10),
    paddingBottom: ResponsiveUtils.normalize(20),
    backgroundColor: ThemeUtils.getDynamicValue('backgroundColor'),
  },
  leftContainer: {
    marginTop: ResponsiveUtils.normalize(20),
    width: ResponsiveUtils.normalize(360),
    marginLeft: ResponsiveUtils.normalize(16),
  },
  rightContainer: {
    flex: 1,
    paddingLeft: ResponsiveUtils.normalize(32),
    backgroundColor: ThemeUtils.getDynamicValue('backgroundColor'),
  },
  tabs: {
    borderWidth: 1,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.primaryColor.light,
    borderRadius: 4,
    height: ResponsiveUtils.normalize(44),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ResponsiveUtils.normalize(10),
  },
  tabActiveStyle: {
    backgroundColor: Colors.primaryColor.light,
  },
  tabBarText: {
    fontSize: ResponsiveUtils.normalize(14),
    color: Colors.primaryColor.light,
  },
  tabBarActiveText: {
    color: '#FFF',
  },
  searchContainer: {
    marginTop: ResponsiveUtils.normalize(10),
    flex: 1,
  },
  btnCalendar: {
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icCalendar: {
    width: ResponsiveUtils.normalize(24),
    height: ResponsiveUtils.normalize(24),
    resizeMode: 'contain',
    marginRight: ResponsiveUtils.normalize(20),
  },
  lbChooseDate: {
    color: '#B1AEAE',
    fontSize: ResponsiveUtils.normalize(16),
  },
  order: {
    flexDirection: 'row',
    backgroundColor: ThemeUtils.getDynamicValue('containerBgColor'),
    paddingLeft: ResponsiveUtils.normalize(22),
    paddingRight: ResponsiveUtils.normalize(30),
    marginBottom: ResponsiveUtils.normalize(8),
    paddingVertical: ResponsiveUtils.normalize(15),
  },
  lbOrderIdActive: {
    color: Colors.primaryColor.light,
  },
  lbOrderId: {
    flex: 1,
    fontSize: ResponsiveUtils.normalize(16),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
  },
  lbOrderTotalAmount: {
    fontSize: ResponsiveUtils.normalize(16),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({ weight: '500' }),
  },
  btnViewMap: {
    borderBottomColor: Colors.primaryColor.light,
    borderBottomWidth: 1,
    alignSelf: 'flex-start',
    marginTop: ResponsiveUtils.normalize(15),
    marginLeft: ResponsiveUtils.normalize(30),
  },
  lbViewMap: {
    color: Colors.primaryColor.light,
    fontSize: ResponsiveUtils.normalize(16),
  },
  itemImage: {
    width: ResponsiveUtils.normalize(58),
    height: ResponsiveUtils.normalize(58),
    resizeMode: 'contain'
  },
  icLoadingMore: {
    alignItems: 'center',
    paddingVertical: 10,
  }
});
