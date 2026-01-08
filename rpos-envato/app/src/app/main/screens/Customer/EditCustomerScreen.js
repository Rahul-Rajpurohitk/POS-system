import React from 'react';
import { EditCustomer } from '@containers';

class EditCustomerScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <EditCustomer navigation={navigation} />;
  }
}

export default EditCustomerScreen;
