import React from 'react';
import { Dashboard } from '@containers';

class DashboardScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <Dashboard navigation={navigation} />;
  }
}

export default DashboardScreen;
