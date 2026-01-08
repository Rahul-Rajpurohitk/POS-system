import { DynamicStyleSheet, DynamicValue } from 'react-native-dark-mode'
import { ThemeUtils, ResponsiveUtils } from '@common';

export const styles = new DynamicStyleSheet({
  container: {
    flex: 1,
    backgroundColor: ThemeUtils.getDynamicValue('backgroundColor'),
  },
  background: {
    resizeMode: 'cover',
    opacity: new DynamicValue(1, 0),
  },
  mainContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logo: {
    marginTop: ResponsiveUtils.normalize(66),
    width: ResponsiveUtils.normalize(120),
    height: ResponsiveUtils.normalize(123),
    resizeMode: 'contain',
  },
  forgotPasswordLabel: {
    marginTop: ResponsiveUtils.normalize(34),
    marginBottom: ResponsiveUtils.normalize(7),
    fontSize: ResponsiveUtils.normalize(16),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    textTransform: 'uppercase'
  },
  forgotContainer: {
    width: ResponsiveUtils.normalize(323),
  },
  inputTitle: {
    marginTop: ResponsiveUtils.normalize(27),
    marginBottom: ResponsiveUtils.normalize(13),
    fontSize: ResponsiveUtils.normalize(14),
    fontWeight: '600',
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({ weight: '500' }),
  },
  btnForgot: {
    backgroundColor: ThemeUtils.getDynamicValue('primaryColor'),
    paddingVertical: ResponsiveUtils.normalize(14),
    alignItems: 'center',
    borderRadius: 4,
  },
  btnTextLogin: {
    fontWeight: '700',
    color: '#FFF',
    fontSize: ResponsiveUtils.normalize(16),
    ...ThemeUtils.fontMaker({ weight: '700' }),
  },
  btnWrapper: {
    paddingVertical: ResponsiveUtils.normalize(20)
  },
  backWrapper: {
    position: 'absolute',
    top: 20,
    left: 20
  }
})