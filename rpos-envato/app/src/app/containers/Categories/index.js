/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, ActivityIndicator, Alert, RefreshControl} from 'react-native';
import {useDynamicStyleSheet, useDarkMode} from 'react-native-dark-mode';
import {useDispatch, useSelector} from 'react-redux';
import {defaults, filter, find} from 'lodash';

import {ActionCreators} from '@actions';
import SearchInput from '@components/SearchInput';
import Table from '@components/Table';
import {ResponsiveUtils, Utils, Constants} from '@common';
import I18n from '@common/I18n';
import {styles as dynamicStyles} from './style';
const {MIN_LENGTH_SEARCH} = Constants;

const configs = [
  {
    header: 'categories.collapse',
    comlumnStyle: {maxWidth: ResponsiveUtils.normalize(40)},
    showCollapsed: true,
  },
  {
    header: 'categories.image',
    comlumnStyle: {paddingLeft: ResponsiveUtils.normalize(10)},
    isImage: true,
    property: 'image',
  },
  {header: 'categories.name', property: 'name'},
  {header: 'categories.product', property: 'count', isZeroNum: true},
  {header: 'categories.actions', actions: ['edit', 'delete']},
];

const Categories = (props) => {
  const {navigation} = props;
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();
  const dispatch = useDispatch();
  const [data, setData] = useState([]);
  const [textSearch, setTextSearch] = useState('');
  const [isRefreshing, setRefreshing] = useState(false);
  const isOfflineMode = useSelector((state) => state.settingReducers.isOfflineMode);
  const categoriesReducer = useSelector((state) => state.categoryReducers.categories);
  const allCategories = categoriesReducer.result;

  useEffect(() => {
    const {getCategories} = ActionCreators;
    if (allCategories.length === 0 && !categoriesReducer.requesting) {
      dispatch(getCategories());
    }
  }, []);

  const groupParentCategory = (allCategoriesData) => {
    let categories = {};
    return filter(allCategoriesData, (obj) => {
      let id = obj.id;
      let parentId = obj.parent;
      categories[id] = defaults(obj, categories[id], {children: []});
      const checkChild = parentId && find(categories[parentId]?.children, (val) => val.id === id);
      if (!checkChild) {
        parentId && categories[parentId]?.children.push(obj);
      }
      return !parentId;
    });
  };

  useEffect(() => {
    if (textSearch.length < MIN_LENGTH_SEARCH) {
      setData(groupParentCategory(allCategories));
    } else {
      search(textSearch);
    }
  }, [categoriesReducer]);

  const onRefresh = () => {
    const {getCategories} = ActionCreators;
    setRefreshing(true);
    setTextSearch('');
    dispatch(getCategories()).then(() => setRefreshing(false));
  };

  const goToAddCategory = () => {
    navigation.navigate('AddCategory');
  };

  const onChangeSearch = (text = '') => {
    const q = text.trim();
    setTextSearch(q);
    if (!q) {
      setData(allCategories);
    } else {
      search(q);
    }
  };

  const search = (q) => {
    const result = allCategories.filter((item) => Utils.searchObject(item, ['name'], q));
    setData(result);
  };

  const handlePressAction = ({type, item}) => {
    if (type === 'delete') {
      Alert.alert(
        'Delete confirm',
        `Are you sure you want to delete category: ${item.name}`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {text: 'OK', onPress: () => deleteCategory(item)},
        ],
        {cancelable: false},
      );
    } else if (type === 'edit') {
      navigation.navigate('EditCategory', {data: item});
    }
  };

  const deleteCategory = (item) => {
    const {removeCategory, saveCategoryDeleted, deleteCategory} = ActionCreators;
    const categoryId = item.id;
    if (categoryId.includes('local-')) {
      return dispatch(removeCategory(categoryId));
    }
    if (isOfflineMode) {
      return dispatch(saveCategoryDeleted(categoryId));
    }
    dispatch(deleteCategory(categoryId));
  };
  return (
    <View style={styles.container}>
      <View style={styles.headWrapper}>
        <SearchInput
          containerStyle={styles.searchContainer}
          placeholder={I18n.t('categories.searchCategory')}
          onChangeText={onChangeSearch}
        />
        <TouchableOpacity style={styles.btnAddNew} onPress={goToAddCategory}>
          <Text style={styles.lbAddNew}>{I18n.t('categories.addCategory')}</Text>
        </TouchableOpacity>
      </View>
      <Table
        data={data}
        configs={configs}
        isDarkMode={isDarkMode}
        disableOnPressItem={false}
        ListFooterComponent={
          categoriesReducer.requesting &&
          !isRefreshing && (
            <View style={styles.icLoadingMore}>
              <ActivityIndicator size="small" />
            </View>
          )
        }
        handlePressAction={handlePressAction}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
};

export default Categories;
