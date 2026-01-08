import React, { Component } from 'react';
import { View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { connect } from 'react-redux';
import { ActionCreators } from '@actions';
import { bindActionCreators } from 'redux';
import { StackActions, NavigationActions } from 'react-navigation';
import { DarkModeProvider } from 'react-native-dark-mode';
import { MenuProvider } from 'react-native-popup-menu';
import * as RNLocalize from 'react-native-localize';
import moment from 'moment';
import { get, map } from 'lodash';

import { Utils } from '@common';
import ModalQuickLinks from '@components/ModalQuickLinks';
import ModalNotification from '@components/ModalNotification';
import { languages } from '@common/data/Languages';
import { getBusiness } from '@services/SettingService'
import I18n from '@common/I18n';
import Router from './Router';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      visibleQuickLinks: false,
      visbleNotification: false,
      pageTitle: '',
      notifications: [],
      page: 0,
      loading: false,
      totalNotification: 0
    };
    this._subscription = null;
    this.setLanguage();
  }

  componentDidMount() {
    this._subscription = NetInfo.addEventListener(
      this._handleConnectionInfoChange,
    );
  }

  componentWillUnmount() {
    this._subscription && this._subscription();
  }

  setLanguage = async () => {
    const { language, changeLanguage } = this.props;
    if (!language) {
      const locales = RNLocalize.getLocales();
      let defaultLang = languages[0];
      if (Array.isArray(locales)) {
        const deviceLang = languages.filter(
          (item) => item.value === locales[0].languageTag,
        );
        if (deviceLang.length > 0) {
          defaultLang = deviceLang[0];
        }
      }
      changeLanguage(defaultLang);
    } else {
      I18n.locale = language.value
      moment.locale(language.value.substring(0, 2))
    }
  };

  _handleConnectionInfoChange = (state) => {
    const { connectionInfoChange } = this.props;
    connectionInfoChange(state.isInternetReachable);
    if (state.isInternetReachable) {
      this.syncData();
    }
  };

  syncData = async () => {
    const { loginReducer } = this.props;
    if (loginReducer.result && loginReducer.result.token) {
      await this.syncUpdatingData();
      await this.syncDeletingData();
      this.refreshData();
    }
  };

  syncUpdatingData = async () => {
    const {
      syncAddCategory,
      syncAddCoupons,
      syncAddCustomers,
      syncAddProducts,
      syncAddOrders,
      syncAddStaffs,
      syncEditingCategories,
      syncEditingCoupons,
      syncEditingProducts,
      syncEditingCustomers,
      sycUpdateUser,
      syncEditingStaffs,
      orderReducers,
      productReducers,
      customerReducers,
      couponReducers,
      categoryReducers,
      userReducers,
    } = this.props;
    const localCategories = categoryReducers.categories.result.filter((item) =>
      item.id.includes('local-'),
    );
    const localCoupons = couponReducers.coupons.result.filter((item) =>
      item.id.includes('local-'),
    );
    const localCustomers = customerReducers.customers.result.filter((item) =>
      item.id.includes('local-'),
    );
    const localProducts = productReducers.products.result.filter((item) =>
      item.id.includes('local-'),
    );
    const localOrders = orderReducers.orders.result.filter((item) =>
      item.id.includes('local-'),
    );
    const localStaffs = userReducers.staffs.result.filter((item) =>
      item.id.includes('local-'),
    );

    const localEditingCategories = categoryReducers.categories.result.filter(
      (item) => item.status === 'editing',
    );
    const localEditingCoupons = couponReducers.coupons.result.filter(
      (item) => item.status === 'editing',
    );
    const localEditingProducts = productReducers.products.result.filter(
      (item) => item.status === 'editing',
    );
    const localEditingCustomers = customerReducers.customers.result.filter(
      (item) => item.status === 'editing',
    );
    const localEditingStaffs = userReducers.staffs.result.filter(
      (item) => item.status === 'editing',
    );

    if (
      localCategories.length > 0 &&
      !categoryReducers.syncAddCategories.requesting
    ) {
      await syncAddCategory(localCategories);
    }
    if (
      localEditingCategories.length > 0 &&
      !categoryReducers.syncEditingCategories.requesting
    ) {
      await syncEditingCategories(localEditingCategories);
    }
    if (localCoupons.length > 0 && !couponReducers.syncAddCoupons.requesting) {
      await syncAddCoupons(localCoupons);
    }
    if (
      localEditingCoupons.length > 0 &&
      !couponReducers.syncEditingCoupons.requesting
    ) {
      await syncEditingCoupons(localEditingCoupons);
    }
    if (
      localProducts.length > 0 &&
      !productReducers.syncAddProducts.requesting
    ) {
      await syncAddProducts(localProducts);
    }
    if (
      localEditingProducts.length > 0 &&
      !productReducers.syncEditingProducts.requesting
    ) {
      await syncEditingProducts(localEditingProducts);
    }
    if (
      localCustomers.length > 0 &&
      !customerReducers.syncAddCustomers.requesting
    ) {
      await syncAddCustomers(localCustomers);
    }
    if (
      localEditingCustomers.length > 0 &&
      !customerReducers.syncEditingCustomers.requesting
    ) {
      await syncEditingCustomers(localEditingCustomers);
    }
    if (localOrders.length > 0 && !orderReducers.syncAddOrders.requesting) {
      await syncAddOrders(localOrders);
    }
    if (localStaffs.length > 0 && !userReducers.syncAddStaffs.requesting) {
      await syncAddStaffs(localStaffs);
    }
    if (
      localEditingStaffs.length > 0 &&
      !userReducers.syncEditingStaffs.requesting
    ) {
      await syncEditingStaffs(localEditingStaffs);
    }

    if (get(userReducers, 'login.result.status') === 'editing') {
      const profile = userReducers.login.result;
      const params = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
      };
      if (params.avatar && params.avatar.indexOf('http') !== 0) {
        params.avatar = profile.avatar;
      }
      await sycUpdateUser(params);
    }
  };

  syncDeletingData = async () => {
    const {
      syncDeletingCategories,
      syncDeletingCoupons,
      syncDeletingProducts,
      syncDeletingCustomers,
      productReducers,
      customerReducers,
      couponReducers,
      categoryReducers,
      userReducers,
      syncDeletingStaffs,
    } = this.props;
    const deletedCategories = categoryReducers.deletedCategories;
    const deletedCoupons = couponReducers.deletedCoupons;
    const deletedProducts = productReducers.deletedProducts;
    const deletedCustomers = customerReducers.deletedCustomers;
    const deletedStaffs = userReducers.deletedStaffs;
    if (deletedCategories.length > 0) {
      await syncDeletingCategories(deletedCategories);
    }
    if (deletedCoupons.length > 0) {
      await syncDeletingCoupons(deletedCoupons);
    }
    if (deletedProducts.length > 0) {
      await syncDeletingProducts(deletedProducts);
    }
    if (deletedCustomers.length > 0) {
      await syncDeletingCustomers(deletedCustomers);
    }
    if (deletedStaffs.length > 0) {
      await syncDeletingStaffs(deletedStaffs);
    }
  };

  refreshData = () => {
    const {
      productReducers,
      customerReducers,
      couponReducers,
      categoryReducers,
      orderReducers,
      userReducers,
      getCategories,
      getCoupons,
      getAllProducts,
      getCustomers,
      getAllOrders,
      getStaffs,
    } = this.props;
    if (!categoryReducers.categories.requesting) {
      getCategories();
    }
    if (!couponReducers.coupons.requesting) {
      getCoupons();
    }
    if (!productReducers.products.requesting) {
      getAllProducts();
    }
    if (!customerReducers.customers.requesting) {
      getCustomers();
    }
    if (!orderReducers.orders.requesting) {
      getAllOrders();
    }
    if (!userReducers.staffs.requesting) {
      getStaffs();
    }
  };

  openQuickLink = (link) => {
    this.toggleQuickLinks();
    this.navigate({ routeName: link.key });
  };

  navigate = ({ routeName, params }) => {
    this.navigatorRef.dispatch(
      NavigationActions.navigate({
        routeName,
        params,
      }),
    );
  };

  handleNavigationChange = (prevState, newState, action) => {
    if (action.type !== 'Navigation/COMPLETE_TRANSITION') {
      const pageTitle = Utils.getPageTitle(newState);
      if (pageTitle) {
        this.setState({
          pageTitle,
        });
      }
    }
  };

  toggleQuickLinks = () => {
    const { visibleQuickLinks } = this.state;
    this.setState({
      visibleQuickLinks: !visibleQuickLinks,
    });
  };

  toggleNotification = () => {
    const { visbleNotification } = this.state;
    if (!visbleNotification) {
      this.loadNotifications(1)
    }
    this.setState({
      visbleNotification: !visbleNotification,
    });
  };

  handleLogout = () => {
    const { logout } = this.props;
    logout();
    setTimeout(() => {
      const resetAction = StackActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'LoginScreen' })],
      });
      this.navigatorRef.dispatch(resetAction);
    }, 500);
  };

  loadNotifications = (pageNumer) => {
    const limit = 10
    const { notifications } = this.state
    this.setState({ page: pageNumer, loading: true }, () => {
      getBusiness({ page: pageNumer, limit })
        .then(res => {
          const notificationData = notifications.concat(res.data)
          this.props.setNotificationIds(map(res.data, it => it._id))
          this.setState({ notifications: notificationData, totalNotification: res.total })
        })
        .catch(error => {
          console.error(error)
        })
        .finally(() => {
          this.setState({ loading: false })
        })
    })
  }

  loadNotificationMore = () => {
    const { page, loading, totalNotification } = this.state
    if (loading) {
      return
    }
    if ((page * 10) > totalNotification) return
    this.setState({ page: page + 1, loading: true }, () => {
      this.loadNotifications(page + 1)
    })
  }

  render() {
    const { loginReducer, isDarkMode } = this.props;
    const { visibleQuickLinks, pageTitle, visbleNotification, notifications, loading } = this.state;
    const userInfo = loginReducer.result;
    return (
      <View style={{ flex: 1 }}>
        <DarkModeProvider mode={isDarkMode ? 'dark' : 'light'}>
          <MenuProvider>
            <Router
              ref={(ref) => {
                this.navigatorRef = ref;
              }}
              screenProps={{
                title: pageTitle,
                showNotifications: () => { },
                openQuickLinks: this.toggleQuickLinks,
                openNotification: this.toggleNotification,
                logout: this.handleLogout,
                userInfo,
                isDarkMode,
              }}
              onNavigationStateChange={this.handleNavigationChange}
            />
          </MenuProvider>
          <ModalQuickLinks
            visible={visibleQuickLinks}
            close={this.toggleQuickLinks}
            openQuickLink={this.openQuickLink}
          />
          <ModalNotification
            visible={visbleNotification}
            onRequestClose={this.toggleNotification}
            isDarkMode={isDarkMode}
            data={notifications}
            loadMoreData={this.loadNotificationMore}
            loading={loading}
          />
        </DarkModeProvider>
      </View>
    );
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(ActionCreators, dispatch);
}

export default connect(
  (state) => ({
    loginReducer: state.userReducers.login,
    isDarkMode: state.settingReducers.isDarkMode,
    language: state.settingReducers.config.language,
    currency: state.settingReducers.config.currency,
    categoryReducers: state.categoryReducers,
    orderReducers: state.orderReducers,
    productReducers: state.productReducers,
    customerReducers: state.customerReducers,
    couponReducers: state.couponReducers,
    userReducers: state.userReducers,
  }),
  mapDispatchToProps,
)(App);
