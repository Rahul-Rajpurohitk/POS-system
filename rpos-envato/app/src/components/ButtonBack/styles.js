import { DynamicStyleSheet } from 'react-native-dark-mode'
import { ResponsiveUtils, ThemeUtils } from '@common'

export const styles = new DynamicStyleSheet({
  btnBack: {
    width: ResponsiveUtils.normalize(104),
    backgroundColor: ThemeUtils.getDynamicValue('containerBgColor'),
    alignItems: 'center',
    borderRadius: 4,
    marginTop: ResponsiveUtils.normalize(15),
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  lbBack: {
    paddingVertical: ResponsiveUtils.normalize(10),
    fontSize: ResponsiveUtils.normalize(14),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({ weight: '500' }),
  },
})
