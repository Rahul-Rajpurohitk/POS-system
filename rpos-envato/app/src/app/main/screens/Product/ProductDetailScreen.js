import React from 'react';
import { ProductDetail } from '@containers';

class ProductDetailScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <ProductDetail navigation={navigation} />;
  }
}

export default ProductDetailScreen;
