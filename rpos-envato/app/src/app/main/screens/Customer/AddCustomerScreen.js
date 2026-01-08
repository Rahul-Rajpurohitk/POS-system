import React from 'react';
import { AddCustomer } from '@containers';

class AddCustomerScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <AddCustomer navigation={navigation} />;
  }
}

export default AddCustomerScreen;
