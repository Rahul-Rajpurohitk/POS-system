import React from 'react';
import { Login } from '@containers';

class LoginScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <Login navigation={navigation} />;
  }
}

export default LoginScreen;
