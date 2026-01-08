import { DynamicStyleSheet, DynamicValue } from 'react-native-dark-mode';

import { ResponsiveUtils, ThemeUtils, Colors } from '@common';

const LARGE_IMAGE_WIDTH = 235;
const LARGE_IMAGE_HEIGHT = 216;
export const SMALL_IMAGE_WIDTH = (LARGE_IMAGE_WIDTH - 21) / 4; //21 is total margin each image
export const styles = new DynamicStyleSheet({
  container: {
    flex: 1,
    backgroundColor: ThemeUtils.getDynamicValue('backgroundColor'),
  },
  headContainer: {
    marginTop: ResponsiveUtils.normalize(23),
    marginRight: ResponsiveUtils.normalize(120),
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    width: ResponsiveUtils.normalize(170),
    height: ResponsiveUtils.normalize(44),
    marginLeft: ResponsiveUtils.normalize(24),
  },
  btnAction: {
    paddingVertical: ResponsiveUtils.normalize(6),
    paddingHorizontal: ResponsiveUtils.normalize(8),
    backgroundColor: '#FF5066',
    borderRadius: 2,
    marginLeft: ResponsiveUtils.normalize(16),
    alignItems: 'center',
    ...ThemeUtils.fontMaker({ weight: '500' }),
  },
  btnEdit: {
    backgroundColor: '#FFC31E',
  },
  btnView: {
    backgroundColor: ThemeUtils.getDynamicValue('primaryColor')
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
  title: {
    flex: 1,
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
  mainContainer: {
    flex: 1,
    marginTop: ResponsiveUtils.normalize(16),
    flexDirection: 'row'
  },
  leftContainer: {
    marginLeft: ResponsiveUtils.normalize(120),
    width: ResponsiveUtils.normalize(LARGE_IMAGE_WIDTH),
  },
  rightContainer: {
    flex: 1,
    marginLeft: ResponsiveUtils.normalize(26),
    paddingRight: ResponsiveUtils.normalize(120),
  },
  largeImageContainer: {
    width: ResponsiveUtils.normalize(LARGE_IMAGE_WIDTH),
    height: ResponsiveUtils.normalize(LARGE_IMAGE_HEIGHT),
    backgroundColor: new DynamicValue('#F1F1F1', Colors.containerBgColor.dark),
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: ResponsiveUtils.normalize(13),
  },
  largeImage: {
    width: ResponsiveUtils.normalize(LARGE_IMAGE_WIDTH),
    height: ResponsiveUtils.normalize(LARGE_IMAGE_HEIGHT),
    resizeMode: 'contain',
  },
  smallImageContainer: {
    backgroundColor: new DynamicValue('#F1F1F1', Colors.containerBgColor.dark),
    borderRadius: 4,
    overflow: 'hidden',
  },
  smallImage: {
    width: ResponsiveUtils.normalize(SMALL_IMAGE_WIDTH),
    height: ResponsiveUtils.normalize(SMALL_IMAGE_WIDTH),
    resizeMode: 'contain',
  },
  separatorImage: {
    width: ResponsiveUtils.normalize(7),
  },
  btnMoveLeft: {
    position: 'absolute',
    left: 0,
    top: ResponsiveUtils.normalize(14),
    padding: ResponsiveUtils.normalize(4),
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  btnMoveRight: {
    position: 'absolute',
    right: 0,
    top: ResponsiveUtils.normalize(14),
    padding: ResponsiveUtils.normalize(4),
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  icArrow: {
    width: ResponsiveUtils.normalize(10),
    height: ResponsiveUtils.normalize(17),
    resizeMode: 'contain',
  },
  tableHeader: {
    fontSize: ResponsiveUtils.normalize(16),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({ weight: '500' }),
  },
  tableRow: {
    fontSize: ResponsiveUtils.normalize(16),
    color: ThemeUtils.getDynamicValue('primaryTextColor'),
    ...ThemeUtils.fontMaker({ weight: '400' }),
  },
  descriptionWrapper: {
    backgroundColor: ThemeUtils.getDynamicValue('containerBgColor'),
    paddingHorizontal: ResponsiveUtils.normalize(24),
    paddingVertical: ResponsiveUtils.normalize(10),
    borderRadius: 2,
  },
  description: {
    marginTop: ResponsiveUtils.normalize(10)
  }
});
