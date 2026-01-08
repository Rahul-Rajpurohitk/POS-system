import React from 'react';
import { POS } from '@containers';

class POSScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <POS navigation={navigation} />;
  }
}

export default POSScreen;
