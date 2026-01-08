import { DynamicStyleSheet, DynamicValue } from 'react-native-dark-mode';
import { ResponsiveUtils, ThemeUtils } from '@common';

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
    marginTop: ResponsiveUtils.normalize(16),
    marginHorizontal: ResponsiveUtils.normalize(120),
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
    alignSelf: 'flex-start',
    backgroundColor: ThemeUtils.getDynamicValue('primaryColor'),
    borderRadius: 4,
    width: ResponsiveUtils.normalize(152),
    height: ResponsiveUtils.normalize(44),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ResponsiveUtils.normalize(10),
    marginTop: ResponsiveUtils.normalize(40),
  },
  lbAddNew: {
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
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: ResponsiveUtils.normalize(1),
    paddingVertical: ResponsiveUtils.normalize(10),
    paddingHorizontal: ResponsiveUtils.normalize(20),
    borderRadius: 4,
    elevation: 1,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  inputText: {
    flex: 1,
    fontSize: ResponsiveUtils.normalize(16),
    alignSelf: 'stretch',
  },
  prefix: {
    width: ResponsiveUtils.normalize(20),
    opacity: new DynamicValue(0.5, 0),
    fontSize: ResponsiveUtils.normalize(16),
  },
  labelRadioStyle: {
    marginLeft: ResponsiveUtils.normalize(10),
    fontSize: ResponsiveUtils.normalize(16),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({ weight: '400' }),
  },
  radioBtnWrapper: {
    marginTop: ResponsiveUtils.normalize(5),
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnRadio: {
    width: ResponsiveUtils.normalize(132),
    flexDirection: 'row',
    alignItems: 'center',
  },
  icRadio: {
    width: ResponsiveUtils.normalize(30),
    height: ResponsiveUtils.normalize(30),
    resizeMode: 'contain',
  },
  btnCalendar: {
    paddingVertical: ResponsiveUtils.normalize(10),
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    backgroundColor: 'white',
    elevation: 1,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowRadius: 2,
    shadowOpacity: 0.25,
    paddingHorizontal: ResponsiveUtils.normalize(10),
  },
  icCalendar: {
    width: ResponsiveUtils.normalize(24),
    height: ResponsiveUtils.normalize(24),
    resizeMode: 'contain',
    marginRight: ResponsiveUtils.normalize(20),
  },
  lbChooseDate: {
    fontSize: ResponsiveUtils.normalize(16),
  },
  dateLabel: {
    color: '#B1AEAE',
  },
});
