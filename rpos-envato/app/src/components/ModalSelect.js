import React from 'react';
import { FlatList, Text, TouchableOpacity, StyleSheet, View } from 'react-native';

import { ResponsiveUtils, Colors } from '@common';
import Modal from './Modal';

const dynamicStyles = (isDarkMode) => {
  return StyleSheet.create({
    modalContainer: {
      flex: 1
    },
    list: {
      marginTop: ResponsiveUtils.normalize(50),
    },
    separatorImage: {
      height: ResponsiveUtils.normalize(1),
      backgroundColor: '#D8D8D8',
    },
    item: {
      paddingVertical: ResponsiveUtils.normalize(15),
      fontSize: ResponsiveUtils.normalize(16),
      color: isDarkMode ? Colors.primaryTextColor.dark : Colors.primaryTextColor.light,
    },
    itemSelected: {
      color: isDarkMode ? Colors.primaryColor.dark : Colors.primaryColor.light,
    },
  });
};

const ModalSelect = (props) => {
  const {
    visible,
    onRequestClose,
    title,
    isDarkMode,
    data,
    onSelect = () => { },
    selected,
    renderClose
  } = props;
  const styles = dynamicStyles(isDarkMode);

  renderRow = ({ item }) => (
    <TouchableOpacity onPress={() => onSelect({ item })}>
      <Text style={[styles.item, selected === item.value && styles.itemSelected]}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      onRequestClose={onRequestClose}
      title={title}
      isDarkMode={isDarkMode}
      renderClose={renderClose}
      containerStyle={styles.modalContainer}>
      <FlatList
        style={styles.list}
        data={data}
        renderItem={renderRow}
        ItemSeparatorComponent={() => <View style={styles.separatorImage} />}
        keyExtractor={(item, index) => index.toString()}
      />
    </Modal>
  );
};

export default ModalSelect;
