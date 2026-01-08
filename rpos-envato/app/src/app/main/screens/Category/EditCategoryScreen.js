import React from 'react';
import { EditCategory } from '@containers';

class EditCategoryScreen extends React.Component {
  render() {
    const { navigation } = this.props;
    return <EditCategory navigation={navigation} />;
  }
}

export default EditCategoryScreen;
