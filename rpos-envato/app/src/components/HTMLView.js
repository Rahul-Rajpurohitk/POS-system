import React from 'react';
import { StyleSheet } from 'react-native';
import HTMLViewRender from 'react-native-htmlview';

const HTMLView = ({ html, isDarkMode }) => {
  return (
    <HTMLViewRender
      value={html}
      stylesheet={styles}
      textComponentProps={{ style: { color: isDarkMode ? '#fff' : '#000' } }}
    />
  );
};

const styles = StyleSheet.create({
  a: {
    fontWeight: '300',
    color: '#FF3366',
  },
});

export default HTMLView;
