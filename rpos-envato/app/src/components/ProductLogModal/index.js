import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, FlatList, Text } from 'react-native';
import Modal from '@components/Modal';
import { dynamicStyles } from './styles';
import ProductServices from '@services/ProductServices';
import moment from 'moment';
import HTMLView from '../HTMLView';

const ProductLogModal = (props) => {
  const { visible, onRequestClose, isDarkMode, productId } = props;
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const styles = dynamicStyles(isDarkMode);
  const [pageData, setPageData] = useState({
    page: 1,
    limit: 10,
  });
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (visible) {
      loadProductLog();
    }
  }, [pageData.page, productId, visible]);

  const loadProductLog = () => {
    setLoading(true);
    ProductServices.getProductLog(productId, pageData)
      .then((res) => {
        setLogs(logs.concat(res.data));
        setTotal(res.total);
        console.log(res.total);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const loadMoreData = () => {
    const { page, limit } = pageData;
    if (page * limit > total || loading) return;
    setPageData({ ...pageData, page: page + 1 });
  };

  const renderItem = ({ item, index }) => {
    return (
      <View style={styles.itemWrapper}>
        <HTMLView html={item.content} isDarkMode={isDarkMode} />
        <Text style={styles.time}>{moment(item.createdAt).fromNow()}</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onRequestClose}
      title={'Product logs'}
      isDarkMode={isDarkMode}
      containerStyle={styles.modalContainer}>
      <View style={{ flex: 1 }}>
        <FlatList
          style={styles.list}
          data={logs}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separatorImage} />}
          keyExtractor={(item, index) => index.toString()}
          onEndReached={loadMoreData}
          onEndReachedThreshold={0.1}
        />
        {loading && (
          <View style={{ flex: 1, marginTop: 10, alignItems: 'center' }}>
            <ActivityIndicator size="small" />
          </View>
        )}
      </View>
    </Modal>
  );
};

export default ProductLogModal;
