import { DynamicStyleSheet, DynamicValue } from 'react-native-dark-mode';

import { ResponsiveUtils, ThemeUtils, Colors } from '@common';

export const styles = new DynamicStyleSheet({
  container: {
    flex: 1,
    backgroundColor: ThemeUtils.getDynamicValue('backgroundColor'),
    paddingRight: ResponsiveUtils.normalize(16),
  },
  headContainer: {
    marginTop: ResponsiveUtils.normalize(23),
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainContainer: {
    flex: 1,
    marginTop: ResponsiveUtils.normalize(16),
    paddingLeft: ResponsiveUtils.normalize(120),
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
  inputLabel: {
    marginTop: ResponsiveUtils.normalize(24),
    marginBottom: ResponsiveUtils.normalize(12),
    fontSize: ResponsiveUtils.normalize(14),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({ weight: '500' }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    marginRight: ResponsiveUtils.normalize(13),
    width: ResponsiveUtils.normalize(60),
    height: ResponsiveUtils.normalize(60),
    borderRadius: ResponsiveUtils.normalize(30),
    overflow: 'hidden',
    backgroundColor: ThemeUtils.getDynamicValue('containerBgColor'),
  },
  avatar: {
    width: ResponsiveUtils.normalize(60),
    height: ResponsiveUtils.normalize(60),
    resizeMode: 'cover',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: ResponsiveUtils.normalize(16),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({ weight: '500' }),
  },
  userId: {
    marginTop: ResponsiveUtils.normalize(5),
    fontSize: ResponsiveUtils.normalize(14),
    color: '#B1AEAE',
    ...ThemeUtils.fontMaker({ weight: '400' }),
  },
  btnAction: {
    paddingVertical: ResponsiveUtils.normalize(6),
    paddingHorizontal: ResponsiveUtils.normalize(8),
    backgroundColor: '#FF5066',
    borderRadius: 2,
    marginLeft: ResponsiveUtils.normalize(16),
    alignItems: 'center',
  },
  btnEdit: {
    backgroundColor: '#FFC31E',
  },
  lbAction: {
    paddingHorizontal: ResponsiveUtils.normalize(10),
    fontSize: ResponsiveUtils.normalize(14),
    color: '#FFF',
    ...ThemeUtils.fontMaker({ weight: '600' }),
  },
  icAction: {
    width: ResponsiveUtils.normalize(20),
    height: ResponsiveUtils.normalize(20),
    resizeMode: 'contain',
  },
  fieldIcon: {
    marginVertical: ResponsiveUtils.normalize(4),
    width: ResponsiveUtils.normalize(24),
    height: ResponsiveUtils.normalize(24),
    resizeMode: 'contain',
    marginRight: ResponsiveUtils.normalize(10),
  },
  fieldValue: {
    fontSize: ResponsiveUtils.normalize(16),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({ weight: '400' }),
  },
  btnViewMap: {
    alignSelf: 'flex-start',
    marginTop: ResponsiveUtils.normalize(10),
    marginBottom: ResponsiveUtils.normalize(15),
    marginLeft: ResponsiveUtils.normalize(30),
  },
  lbViewMap: {
    color: Colors.primaryColor.light,
    fontSize: ResponsiveUtils.normalize(16),
  },
  userInfoDetail: {
    marginVertical: ResponsiveUtils.normalize(22),
  }
});
