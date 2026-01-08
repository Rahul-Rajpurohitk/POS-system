import React from 'react';
import { AddCoupon } from '@containers';

class AddCouponScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <AddCoupon navigation={navigation} />;
  }
}

export default AddCouponScreen;
