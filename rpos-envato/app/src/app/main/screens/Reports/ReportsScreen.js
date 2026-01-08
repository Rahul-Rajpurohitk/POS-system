import React from 'react';
import { Reports } from '@containers';

class ReportsScreen extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    title: 'Reports',
  });

  render() {
    const { navigation } = this.props;
    return <Reports navigation={navigation} onBack={() => navigation.goBack()} />;
  }
}

export default ReportsScreen;
