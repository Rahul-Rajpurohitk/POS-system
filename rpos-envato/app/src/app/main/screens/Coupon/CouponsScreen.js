import React from 'react';
import { Coupon } from '@containers';

class CouponsScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <Coupon navigation={navigation} />;
  }
}

export default CouponsScreen;
