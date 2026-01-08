import React from 'react';
import { AddProduct } from '@containers';

class AddProductScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <AddProduct navigation={navigation} />;
  }
}

export default AddProductScreen;
