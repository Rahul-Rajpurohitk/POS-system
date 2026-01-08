import { Dimensions, PixelRatio } from 'react-native';

// based on iphone x scale
// const iPhoneXHeight = 812;
const iPadWidth = 1024;
// const scaleVertical = Dimensions.get('window').height / iPhoneXHeight;
const scaleHorizontal = Dimensions.get('window').width / iPadWidth;

export const normalize = size => {
  const newSize = size * scaleHorizontal;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};
