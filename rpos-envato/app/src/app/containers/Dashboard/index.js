import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  Text,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useDynamicStyleSheet, useDynamicValue } from 'react-native-dark-mode';
import { slice } from 'lodash';
import moment from 'moment';
import { useSelector } from 'react-redux';

const { width: screensWidth } = Dimensions.get('window');

import { QUICK_LINKS } from '@common/data/QuickLinks';
import { ResponsiveUtils, Colors, Constants, Utils } from '@common';
import ReportServices from '@services/ReportServices';
import I18n from '@common/I18n';
import { styles as dynamicStyles } from './style';

const QuickLinks = ({ navigation, styles }) => {
  return (
    <View style={styles.quickLinks}>
      {QUICK_LINKS.map((link, index) => (
        <TouchableOpacity
          key={index.toString()}
          onPress={() => navigation.navigate(link.key)}
          style={[styles.quickLinkItem, index === 0 && { marginLeft: 0 }]}>
          <Image source={link.image} style={styles.qickLinkIcon} />
          <Text style={styles.qickLinkText}>{I18n.t(link.name)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const Dashboard = ({ navigation }) => {
  const styles = useDynamicStyleSheet(dynamicStyles);
  const chartBackground = useDynamicValue(Colors.containerBgColor.light, Colors.containerBgColor.dark);

  const [charProductConfig, setChartProductConfig] = useState(null);
  const [loadingTopProduct, setLoadingTopProduct] = useState(null);
  const [charMonthlyConfig, setChartMonthlyConfig] = useState(null);
  const [loadingMonthly, setLoadingMonthly] = useState(null);
  const currency = useSelector(state => state.settingReducers.config.currency);

  useEffect(() => {
    getTopProducts();
    getMonthlySale();
  }, []);

  getTopProducts = () => {
    setLoadingTopProduct(true);
    ReportServices.getTopProducts().then(({ data }) => {
      const products = slice(data, 0, Constants.NUMBER_CHART_COLUMNS);
      const chartTopProductLables = products.map(
        product => product.name.length > Constants.MAX_LENGTH_CHART_LABEL
          ? `${product.name.substring(0, Constants.MAX_LENGTH_CHART_LABEL)}...`
          : product.name
      );
      const dataChart = products.map((product) => product.amount);
      const chartProducts = {
        labels: chartTopProductLables,
        datasets: [
          {
            data: dataChart,
            color: () => `rgba(255, 80, 102, 1)`,
          },
        ]
      };
      setLoadingTopProduct(false);
      setChartProductConfig(chartProducts);
    }).catch((error) => {
      setLoadingTopProduct(false);
    });
  }

  getMonthlySale = () => {
    setLoadingMonthly(true);
    ReportServices.getReportMonthly().then(({ data }) => {
      const chartMonthlyLables = moment.monthsShort();
      const chartMonthly = {
        labels: chartMonthlyLables,
        datasets: [
          {
            data,
            color: () => `rgba(255, 80, 102, 1)`,
          },
        ]
      };
      setLoadingMonthly(false);
      setChartMonthlyConfig(chartMonthly);
    }).catch((error) => {
      setLoadingMonthly(false);
    });
  }

  return (
    <View style={styles.container}>
      <QuickLinks navigation={navigation} styles={styles} />
      <ScrollView style={styles.mainContainer}>
        <View style={styles.chartContainer}>
          <Text style={styles.chartName}>{I18n.t("dashboard.monthlySales")}</Text>
          {charMonthlyConfig ? (
            <LineChart
              data={charMonthlyConfig}
              width={screensWidth - ResponsiveUtils.normalize(80)}
              height={ResponsiveUtils.normalize(300)}
              style={{ paddingRight: ResponsiveUtils.normalize(90)}}
              fromZero
              formatYLabel={(value) => Utils.formatCurrency(value, currency)}
              chartConfig={{
                backgroundGradientFrom: chartBackground,
                backgroundGradientTo: chartBackground,
                fillShadowGradient: '#ff5066',
                decimalPlaces: 0, // optional, defaults to 2dp
                strokeWidth: 2,
                color: (opacity = 255) => `rgba(255, 80, 102, ${opacity})`,
                labelColor: () => '#74787c',
                propsForLabels: { fontSize: ResponsiveUtils.normalize(13) },
                style: { borderRadius: 0 },
              }}
              bezier
            />) : (
              <View style={styles.chartEmptyContainer}>
                {loadingMonthly ? (
                  <ActivityIndicator size="small" />
                ) : (
                    <Text style={styles.lbChartError}>something went wrong</Text>
                  )}
              </View>
            )}
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartName}>{I18n.t("dashboard.products")}</Text>
          {charProductConfig ? (
            <BarChart
              data={charProductConfig}
              width={screensWidth - ResponsiveUtils.normalize(80)}
              height={ResponsiveUtils.normalize(300)}
              style={{ paddingRight: ResponsiveUtils.normalize(90)}}
              fromZero
              chartConfig={{
                backgroundGradientFrom: chartBackground,
                backgroundGradientTo: chartBackground,
                fillShadowGradient: Colors.primaryColor.light,
                fillShadowGradientOpacity: 1,
                decimalPlaces: 0, // optional, defaults to 2dp
                color: (opacity = 1) => `rgba(0, 122, 179, ${opacity})`,
                labelColor: () => '#74787c',
                style: { borderRadius: 0 },
                propsForLabels: { fontSize: ResponsiveUtils.normalize(13) },
                formatYLabel: (value) => Utils.formatCurrency(value, currency)
              }}
              bezier
            />
          ) : (
              <View style={styles.chartEmptyContainer}>
                {loadingTopProduct ? (
                  <ActivityIndicator size="small" />
                ) : (
                    <Text style={styles.lbChartError}>something went wrong</Text>
                  )}
              </View>
            )}
        </View>
      </ScrollView>
    </View>
  );
}

export default Dashboard;
