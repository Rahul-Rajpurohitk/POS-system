import React from 'react';
import { CustomerDetail } from '@containers';

class CustomerDetailScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <CustomerDetail navigation={navigation} />;
  }
}

export default CustomerDetailScreen;
