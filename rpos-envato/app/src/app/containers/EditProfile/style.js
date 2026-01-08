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
    marginTop: ResponsiveUtils.normalize(16),
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
  btnSave: {
    alignSelf: 'flex-start',
    backgroundColor: ThemeUtils.getDynamicValue('primaryColor'),
    borderRadius: 4,
    width: ResponsiveUtils.normalize(152),
    height: ResponsiveUtils.normalize(44),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ResponsiveUtils.normalize(10),
    marginTop: ResponsiveUtils.normalize(50),
  },
  lbSave: {
    fontSize: ResponsiveUtils.normalize(16),
    color: '#FFF',
    ...ThemeUtils.fontMaker({ weight: '700' }),
  },
  inputLabel: {
    marginTop: ResponsiveUtils.normalize(24),
    marginBottom: ResponsiveUtils.normalize(12),
    fontSize: ResponsiveUtils.normalize(14),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({ weight: '500' }),
  },
  btnAddImage: {
    backgroundColor: new DynamicValue('#f3f3f3', Colors.containerBgColor.dark),
    borderWidth: 1,
    borderColor: '#C5C4C4',
    width: ResponsiveUtils.normalize(96),
    height: ResponsiveUtils.normalize(96),
    borderRadius: ResponsiveUtils.normalize(48),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icAddPhoto: {
    position: 'absolute',
    bottom: ResponsiveUtils.normalize(10),
    width: ResponsiveUtils.normalize(24),
    height: ResponsiveUtils.normalize(24),
    resizeMode: 'contain',
  },
  avatar: {
    width: ResponsiveUtils.normalize(96),
    height: ResponsiveUtils.normalize(96),
    resizeMode: 'cover',
  }
});
