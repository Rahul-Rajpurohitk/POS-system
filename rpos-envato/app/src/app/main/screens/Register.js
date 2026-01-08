import React from 'react';
import { Register } from '@containers';

class RegisterScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <Register navigation={navigation} />;
  }
}

export default RegisterScreen;
