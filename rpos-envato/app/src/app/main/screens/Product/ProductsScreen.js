import React from 'react';
import { Products } from '@containers';

class ProductsScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <Products navigation={navigation} />;
  }
}

export default ProductsScreen;
