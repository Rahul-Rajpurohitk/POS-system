import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { useDynamicStyleSheet, useDarkMode } from 'react-native-dark-mode';
import moment from 'moment';
import { get, capitalize } from 'lodash';
import { useSelector } from 'react-redux';

import ReportServices from '@services/ReportServices';
import Table from '@components/Table';
import I18n from '@common/I18n';
import { styles as dynamicStyles } from './style';
import {
  tabDailyConfigs,
  tableWeeklyConfigs,
  tableMonthlyConfigs,
  tableTopProductsConfigs,
  tabsConfig,
} from './configs';

const Reports = props => {
  const styles = useDynamicStyleSheet(dynamicStyles);
  const isDarkMode = useDarkMode();
  const tabRef = useRef('');
  const [tabActive, setTabActive] = useState(0);
  const [dataDaily, setDataDaily] = useState(null);
  const [dataWeekly, setDataWeekly] = useState(null);
  const [dataMonthly, setDataMonthly] = useState(null);
  const [dataTopProducts, setDataTopProducts] = useState(null);
  const [isLoadingDaily, setLoadingDaily] = useState(false);
  const [isLoadingWeekly, setLoadingWeekly] = useState(null);
  const [isLoadingMonthly, setLoadingMonthly] = useState(null);
  const [isLoadingTopProduct, setLoadingTopProducts] = useState(null);
  const currency = useSelector(state => state.settingReducers.config.currency);

  useEffect(() => {
    getDataReportMonthly();
    getDataReportWeekly();
    getDataTopProducts();
    getDataReportDaily();
  }, []);

  onChangeTab = tabIndex => {
    tabRef.current.goToPage(tabIndex);
    setTabActive(tabIndex);
  };

  getDataReportDaily = () => {
    setLoadingDaily(true);
    ReportServices.getReportDaily()
      .then(({ data }) => {
        const products = [];
        data.forEach(order => {
          order.items.forEach(item => {
            const quantity = get(item, 'quantity', 0);
            const total = quantity * get(item, 'product.sellingPrice', 0);
            products.push({
              createdAt: moment(order.createdAt).format('HH:mm A'),
              customer: get(order, 'customer.name'),
              product: get(item, 'product.name'),
              quantity,
              total,
            });
          });
        });
        setDataDaily(products);
        setLoadingDaily(false);
      })
      .catch(error => {
        setLoadingDaily(false);
      });
  };

  getDataReportWeekly = () => {
    setLoadingWeekly(true);
    ReportServices.getReportWeekly()
      .then(({ data }) => {
        const weekdays = moment.weekdays(true);
        const dataTable = data.map((item, index) => ({ day: capitalize(weekdays[index]), value: item }));
        setDataWeekly(dataTable);
        setLoadingWeekly(false);
      })
      .catch(error => {
        setLoadingWeekly(false);
      });
  };

  getDataReportMonthly = () => {
    setLoadingMonthly(true);
    ReportServices.getReportMonthly()
      .then(({ data }) => {
        const months = moment.months();
        const dataTable = data.map((item, index) => ({ month: capitalize(months[index]), value: item }));
        setDataMonthly(dataTable);
        setLoadingMonthly(false);
      })
      .catch(error => {
        setLoadingMonthly(false);
      });
  };

  getDataTopProducts = () => {
    setLoadingTopProducts(true);
    ReportServices.getTopProducts()
      .then(({ data }) => {
        setDataTopProducts(data);
        setLoadingTopProducts(false);
      })
      .catch(error => {
        setLoadingTopProducts(false);
      });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.tabsContainer}>
          {tabsConfig.map((item, index) => (
            <TouchableOpacity
              key={index.toString()}
              style={[styles.tabContainer, tabActive === index && styles.tabContainerActive]}
              onPress={() => onChangeTab(item.tabIndex)}>
              <Text style={[styles.tabLabel, tabActive === index && styles.tabLabelActive]}>{I18n.t(item.tab)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.btnExport}>
          <Text style={styles.lbExport}>Export CSV</Text>
        </TouchableOpacity>
      </View>
      <ScrollableTabView
        ref={tabRef}
        initialPage={0}
        tabBarUnderlineStyle={{ height: 0 }}
        renderTabBar={() => <View />}
        contentProps={{ pageMargin: 16, scrollEnabled: false }}>
        <View style={styles.tableContainer}>
          {isLoadingDaily ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FFF" />
            </View>
          ) : (
            <Table data={dataDaily} configs={tabDailyConfigs} isDarkMode={isDarkMode} currency={currency} />
          )}
        </View>
        {isLoadingWeekly ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FFF" />
          </View>
        ) : (
          <Table data={dataWeekly} configs={tableWeeklyConfigs} isDarkMode={isDarkMode} currency={currency} />
        )}
        <View style={styles.tableContainer}>
          {isLoadingMonthly ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FFF" />
            </View>
          ) : (
            <Table data={dataMonthly} configs={tableMonthlyConfigs} isDarkMode={isDarkMode} currency={currency} />
          )}
        </View>
        <View style={styles.tableContainer}>
          {isLoadingTopProduct ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FFF" />
            </View>
          ) : (
            <Table
              data={dataTopProducts}
              configs={tableTopProductsConfigs}
              isDarkMode={isDarkMode}
              currency={currency}
            />
          )}
        </View>
      </ScrollableTabView>
    </View>
  );
};

export default Reports;
