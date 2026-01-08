import React from 'react';
import { EditProduct } from '@containers';

class EditProductScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <EditProduct navigation={navigation} />;
  }
}

export default EditProductScreen;
