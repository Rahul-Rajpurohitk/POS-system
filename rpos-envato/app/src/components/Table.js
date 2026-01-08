import React, { useState } from 'react';
import { View, StyleSheet, Text, FlatList, TouchableOpacity, Image, TouchableWithoutFeedback } from 'react-native';
import { get, isEmpty } from 'lodash';

import { ResponsiveUtils, Colors, ThemeUtils } from '@common';
import I18n from '@common/I18n';

const dynamicStyles = (isDarkMode) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tableRowChildren: {
      marginBottom: ResponsiveUtils.normalize(2),
    },
    tableRowContainer: {
      backgroundColor: isDarkMode ? Colors.containerBgColor.dark : Colors.containerBgColor.light,
      marginBottom: ResponsiveUtils.normalize(8),
      paddingVertical: ResponsiveUtils.normalize(2),
    },
    collapseContainer: {
      borderTopWidth: 1,
      paddingVertical: ResponsiveUtils.normalize(4),
      borderTopColor: isDarkMode ? Colors.borderColor.dark : Colors.borderColor.light,
    },
    column: {
      flex: 1,
      paddingLeft: ResponsiveUtils.normalize(24),
    },
    tableHeader: {
      ...ThemeUtils.fontMaker({ weight: '600' }),
    },
    textStyle: {
      marginVertical: ResponsiveUtils.normalize(10),
      color: isDarkMode ? Colors.primaryTextColor.dark : Colors.primaryTextColor.light,
      fontSize: ResponsiveUtils.normalize(16),
      ...ThemeUtils.fontMaker({ weight: '400' }),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    btnAction: {
      paddingVertical: ResponsiveUtils.normalize(6),
      paddingHorizontal: ResponsiveUtils.normalize(8),
      backgroundColor: '#FF5066',
      borderRadius: 2,
      marginRight: ResponsiveUtils.normalize(16),
    },
    btnEdit: {
      backgroundColor: '#FFC31E',
    },
    btnDetail: {
      backgroundColor: '#33b9f7',
    },
    lbAction: {
      paddingHorizontal: ResponsiveUtils.normalize(10),
      fontSize: ResponsiveUtils.normalize(14),
      color: '#FFF',
      ...ThemeUtils.fontMaker({ weight: '500' }),
    },
    icAction: {
      width: ResponsiveUtils.normalize(20),
      height: ResponsiveUtils.normalize(20),
      resizeMode: 'contain',
    },
    image: {
      height: ResponsiveUtils.normalize(46),
      width: ResponsiveUtils.normalize(46),
      resizeMode: 'contain',
    },
    childrenImage: {
      paddingLeft: ResponsiveUtils.normalize(20),
    },
    collapseBtn: {
      height: ResponsiveUtils.normalize(40),
      alignItems: 'center',
      justifyContent: 'center',
    },
    collapseIcon: {
      height: ResponsiveUtils.normalize(8),
      width: ResponsiveUtils.normalize(15),
      marginRight: ResponsiveUtils.normalize(16),
      resizeMode: 'contain',
    },
  });
};

const TableItem = ({ item, rowStyle, isDarkMode, configs, onPressItem, disableOnPressItem, handlePressAction }) => {
  const styles = dynamicStyles(isDarkMode);
  const isChildren = !isEmpty(item.children);
  const [collapsed, setCollapsed] = useState(false);

  const onPressItemHandler = ({ item }) => {
    onPressItem ? onPressItem({ item }) : isChildren && setCollapsed(!collapsed);
  };

  return (
    <View style={styles.tableRowContainer}>
      <TouchableOpacity
        style={[styles.tableRow, rowStyle]}
        disabled={disableOnPressItem}
        onPress={() => onPressItemHandler({ item })}>
        {configs.map((config, index) => {
          return renderColumn({
            config,
            item,
            index,
            onPressAction: ({ type }) => handlePressAction({ type, item }),
            onPressCollapsed: () => setCollapsed(!collapsed),
          });
        })}
      </TouchableOpacity>
      {collapsed && isChildren && (
        <View style={styles.collapseContainer}>
          <FlatList
            data={item.children}
            renderItem={({ item }) => {
              return (
                <TouchableOpacity disabled={true} style={[styles.tableRow, styles.tableRowChildren, rowStyle]}>
                  {configs.map((config, index) => {
                    return renderColumn({
                      config,
                      item,
                      index,
                      onPressAction: ({ type }) => handlePressAction({ type, item }),
                      isChildren,
                    });
                  })}
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item, index) => index.toString()}
          />
        </View>
      )}
    </View>
  );
};

const Table = (props) => {
  const {
    isDarkMode,
    rowStyle,
    configs,
    data,
    onPressItem,
    disableOnPressItem = true,
    handlePressAction = () => {},
    currency,
  } = props;
  const styles = dynamicStyles(isDarkMode);

  renderActions = ({ config, index, onPressAction }) => (
    <View style={[styles.column, config.comlumnStyle]} key={index.toString()}>
      <TouchableWithoutFeedback>
        <View style={styles.row}>
          {config.actions.map((action, index) => {
            if (action === 'edit') {
              return (
                <TouchableOpacity
                  onPress={() => onPressAction({ type: action })}
                  style={[styles.row, styles.btnAction, styles.btnEdit]}
                  key={index.toString()}>
                  <Image source={require('@assets/icons/ic_edit_white.png')} style={styles.icAction} />
                  <Text style={styles.lbAction}>Edit</Text>
                </TouchableOpacity>
              );
            }
            if (action === 'delete') {
              return (
                <TouchableOpacity
                  onPress={() => onPressAction({ type: action })}
                  style={[styles.row, styles.btnAction]}
                  key={index.toString()}>
                  <Image source={require('@assets/icons/ic_delete.png')} style={styles.icAction} />
                  <Text style={styles.lbAction}>Delete</Text>
                </TouchableOpacity>
              );
            }
            if (action === 'detail') {
              return (
                <TouchableOpacity
                  onPress={() => onPressAction({ type: action })}
                  style={[styles.row, styles.btnAction, styles.btnDetail]}
                  key={index.toString()}>
                  <Image source={require('@assets/icons/ic_search_white.png')} style={styles.icAction} />
                  <Text style={styles.lbAction}>Detail</Text>
                </TouchableOpacity>
              );
            }
          })}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );

  renderColumn = ({ config, item, index, onPressAction, onPressCollapsed, isChildren, collapsed }) => {
    if (config.showCollapsed && !isEmpty(item.children)) {
      return (
        <View style={[styles.column, config.comlumnStyle, styles.collapseBtn]} key={index.toString()}>
          <TouchableOpacity style={styles.collapseBtn} onPress={onPressCollapsed}>
            <Image source={require('@assets/icons/ic_dropdown_gray.png')} style={styles.collapseIcon} />
          </TouchableOpacity>
        </View>
      );
    }

    if (config.actions) {
      return renderActions({ config, index, onPressAction });
    }
    const defaultZero = config.isZeroNum ? 0 : '';
    let value = get(item, config.property, defaultZero);
    if (config.format) {
      value = config.format(value, currency);
    }

    if (config.isImage) {
      return (
        <View style={[styles.column, config.comlumnStyle]} key={index.toString()}>
          <View style={isChildren && styles.childrenImage}>
            {!!value && <Image source={{ uri: value }} style={styles.image} />}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.column, config.comlumnStyle]} key={index.toString()}>
        <Text style={[styles.textStyle, config.textStyle]}>{value}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tableRow}>
        {configs.map((item, index) => (
          <View style={[styles.column, item.comlumnStyle]} key={index.toString()}>
            <Text style={[styles.textStyle, styles.tableHeader, item.textStyle]}>{I18n.t(item.header)}</Text>
          </View>
        ))}
      </View>
      <FlatList
        data={data}
        renderItem={({ item, index }) => (
          <TableItem
            item={item}
            index={index}
            rowStyle={rowStyle}
            isDarkMode={isDarkMode}
            configs={configs}
            onPressItem={onPressItem}
            disableOnPressItem={disableOnPressItem}
            handlePressAction={handlePressAction}
          />
        )}
        keyExtractor={(item, index) => index.toString()}
        {...props}
      />
    </View>
  );
};

export default Table;
