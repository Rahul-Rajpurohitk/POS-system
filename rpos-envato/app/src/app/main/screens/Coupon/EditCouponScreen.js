import React from 'react';
import { EditCoupon } from '@containers';

class EditCouponScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <EditCoupon navigation={navigation} />;
  }
}

export default EditCouponScreen;
