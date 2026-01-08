import React from 'react';
import { Setting } from '@containers';

class SettingsScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <Setting navigation={navigation} />;
  }
}

export default SettingsScreen;
