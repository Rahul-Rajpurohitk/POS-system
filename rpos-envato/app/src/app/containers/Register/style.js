import {DynamicStyleSheet, DynamicValue} from 'react-native-dark-mode';
import {ResponsiveUtils, ThemeUtils} from '@common';

export const styles = new DynamicStyleSheet({
  container: {
    flex: 1,
    backgroundColor: ThemeUtils.getDynamicValue('backgroundColor'),
  },
  mainContainer: {
    flex: 1,
    alignItems: 'center',
  },
  background: {
    resizeMode: 'cover',
    opacity: new DynamicValue(1, 0),
  },
  logo: {
    marginTop: ResponsiveUtils.normalize(50),
    width: ResponsiveUtils.normalize(90),
    height: ResponsiveUtils.normalize(90),
    resizeMode: 'contain',
  },
  lbLoginYourAccount: {
    marginTop: ResponsiveUtils.normalize(15),
    marginBottom: ResponsiveUtils.normalize(7),
    fontSize: ResponsiveUtils.normalize(16),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
  },
  loginContainer: {
    width: ResponsiveUtils.normalize(323),
  },
  inputTitle: {
    marginTop: ResponsiveUtils.normalize(16),
    marginBottom: ResponsiveUtils.normalize(13),
    fontSize: ResponsiveUtils.normalize(14),
    fontWeight: '600',
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({weight: '500'}),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ThemeUtils.getDynamicValue('containerBgColor'),
    paddingHorizontal: ResponsiveUtils.normalize(17),
    borderRadius: 4,
    elevation: 1,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  textInput: {
    flex: 1,
    paddingVertical: ResponsiveUtils.normalize(10),
    width: ResponsiveUtils.normalize(323),
    fontSize: ResponsiveUtils.normalize(16),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
  },
  btnShowPassword: {
    width: ResponsiveUtils.normalize(24),
    height: ResponsiveUtils.normalize(24),
    resizeMode: 'contain',
    paddingHorizontal: ResponsiveUtils.normalize(3),
  },
  btnLogin: {
    marginTop: ResponsiveUtils.normalize(30),
    backgroundColor: ThemeUtils.getDynamicValue('primaryColor'),
    paddingVertical: ResponsiveUtils.normalize(14),
    alignItems: 'center',
    borderRadius: 4,
  },
  lbLogin: {
    fontWeight: '700',
    color: '#FFF',
    fontSize: ResponsiveUtils.normalize(16),
    ...ThemeUtils.fontMaker({weight: '700'}),
  },
  backWrapper: {
    position: 'absolute',
    top: ResponsiveUtils.normalize(20),
    left: ResponsiveUtils.normalize(20),
  },
});
