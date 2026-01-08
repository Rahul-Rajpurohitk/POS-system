import { DynamicStyleSheet, DynamicValue } from 'react-native-dark-mode';
import { ResponsiveUtils, ThemeUtils, Colors } from '@common';

export const styles = new DynamicStyleSheet({
  container: {
    flex: 1,
    backgroundColor: ThemeUtils.getDynamicValue('backgroundColor'),
  },
  headContainer: {
    marginTop: ResponsiveUtils.normalize(23),
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainContainer: {
    flex: 1,
    marginTop: ResponsiveUtils.normalize(50),
    paddingHorizontal: ResponsiveUtils.normalize(120),
  },
  title: {
    marginLeft: ResponsiveUtils.normalize(50),
    fontSize: ResponsiveUtils.normalize(18),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({ weight: '700' }),
  },
  btnBack: {
    marginLeft: ResponsiveUtils.normalize(16),
    width: ResponsiveUtils.normalize(104),
    backgroundColor: ThemeUtils.getDynamicValue('containerBgColor'),
    alignItems: 'center',
    borderRadius: 4,
  },
  lbBack: {
    paddingVertical: ResponsiveUtils.normalize(12),
    fontSize: ResponsiveUtils.normalize(16),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({ weight: '500' }),
  },
  btnAddNew: {
    backgroundColor: ThemeUtils.getDynamicValue('primaryColor'),
    borderRadius: 28,
    width: ResponsiveUtils.normalize(56),
    height: ResponsiveUtils.normalize(56),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: ResponsiveUtils.normalize(30),
    right: ResponsiveUtils.normalize(30),
  },
  item: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  itemContent: {
    flex: 1,
  },
  btnConnect: {
    borderWidth: 1,
    borderColor: '#000',
    paddingHorizontal: ResponsiveUtils.normalize(20),
    alignItems: 'center',
    justifyContent: 'center',
    height: ResponsiveUtils.normalize(44),
    borderRadius: ResponsiveUtils.normalize(22),
  },
  section: {
    fontWeight: 'bold',
    marginBottom: ResponsiveUtils.normalize(10),
  },
});
