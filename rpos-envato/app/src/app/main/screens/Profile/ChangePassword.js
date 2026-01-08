import React from 'react';
import { ChangePassword } from '@containers';

class ChangePasswordScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <ChangePassword navigation={navigation} />;
  }
}

export default ChangePasswordScreen;
