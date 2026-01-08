import React from 'react';
import { AddCategory } from '@containers';

class AddCategoryScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <AddCategory navigation={navigation} />;
  }
}

export default AddCategoryScreen;
