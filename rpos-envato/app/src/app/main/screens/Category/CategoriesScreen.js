import React from 'react';
import {Categories} from '@containers';

class CategoriesScreen extends React.Component {
  render() {
    const {navigation} = this.props;
    return <Categories navigation={navigation} />;
  }
}

export default CategoriesScreen;
