import React from 'react';
import { Customers } from '@containers';

class CustomersScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <Customers navigation={navigation} />;
  }
}

export default CustomersScreen;
