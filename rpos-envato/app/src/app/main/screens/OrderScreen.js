import React from 'react';
import { Order } from '@containers';

class OrderScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <Order navigation={navigation} />;
  }
}

export default OrderScreen;
