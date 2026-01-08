import * as ResponsiveUtils from './ResponsiveUtils';
import { Colors } from '@common';

export default {
  Container: {
    flex: 1,
  },
  Title: {
    fontSize: 18,
    textAlign: 'center',
    color: '#000',
    fontWeight: 'bold',
  },
  Label: {
    fontSize: 16,
    color: '#acbbc8',
  },
  TabLabel: {
    fontSize: ResponsiveUtils.normalize(13),
    textAlign: 'center',
  },
  TabImage: {
    width: ResponsiveUtils.normalize(30),
    height: ResponsiveUtils.normalize(30),
    resizeMode: 'contain',
  },
  headerStyle: {
    flexDirection: 'row',
    height: ResponsiveUtils.normalize(64),
    paddingTop: Platform.OS == 'ios' ? 20 : 0, // only for IOS to give StatusBar Space,
    backgroundColor: Colors.primaryColor.light,
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    marginLeft: ResponsiveUtils.normalize(23),
    width: ResponsiveUtils.normalize(34),
    height: ResponsiveUtils.normalize(34),
    resizeMode: 'contain',
  },
  headerTitleStyle: {
    fontSize: ResponsiveUtils.normalize(18),
    color: '#FFF',
    fontWeight: '700',
  },
};
