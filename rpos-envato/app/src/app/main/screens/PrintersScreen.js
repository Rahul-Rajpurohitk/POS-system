import React from 'react';
import { Printers } from '@containers';

class PrintersScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <Printers navigation={navigation} />;
  }
}

export default PrintersScreen;
