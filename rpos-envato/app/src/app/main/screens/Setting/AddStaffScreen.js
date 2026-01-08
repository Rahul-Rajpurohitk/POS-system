import React from 'react';
import { AddStaff } from '@containers';

class AddStaffScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <AddStaff navigation={navigation} />;
  }
}

export default AddStaffScreen;
