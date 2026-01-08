import React from 'react';
import { EditStaff } from '@containers';

class EditStaffScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <EditStaff navigation={navigation} />;
  }
}

export default EditStaffScreen;
