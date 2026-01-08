import React from 'react';
import { EditProfile } from '@containers';

class EditProfileScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <EditProfile navigation={navigation} />;
  }
}

export default EditProfileScreen;
