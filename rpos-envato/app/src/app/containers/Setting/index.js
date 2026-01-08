import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useDynamicStyleSheet } from 'react-native-dark-mode';
import ToggleSwitch from 'toggle-switch-react-native';
import ModalSelect from '@components/ModalSelect';
import TextInput from '@components/TextInput';
import ButtonLoading from '@components/ButtonLoading';
import DropdownAlert from 'react-native-dropdownalert';
import I18n from '@common/I18n';
import { languages } from '@common/data/Languages';
import { Currencies } from '@common/data/Currencies';
import { styles as dynamicStyles } from './style';
import SettingHook from './hook';

const Setting = ({ navigation }) => {
  const styles = useDynamicStyleSheet(dynamicStyles);
  const {
    currency,
    language,
    visibleLangModal,
    setVisibleLangModal,
    visibleCurrencyModal,
    setVisibleCurrencyModal,
    onChangeLang,
    onChangeCurrency,
    handleToggleDarkMode,
    isDarkMode,
    loading,
    tax,
    setTax,
    onChangeConfig,
    alertRef,
    name,
    setName,
  } = SettingHook();
  const lightIcArrowRight = require('@assets/icons/ic_arrow_right_black.png');
  const darkIcArrowRight = require('@assets/icons/ic_arrow_right.png');
  const icArrowRight = isDarkMode ? darkIcArrowRight : lightIcArrowRight;

  const goToPrinters = () => {
    navigation.navigate('Printers');
  };

  return (
    <View style={styles.container}>
      <View style={styles.settingContainer}>
        <Text style={styles.label}>{I18n.t('setting.changeLanguage')}</Text>
        <TouchableOpacity style={styles.btnSelect} onPress={() => setVisibleLangModal(true)}>
          <Text style={styles.selectValue}>{language && language.label}</Text>
          <Image source={icArrowRight} style={styles.icArrowRight} />
        </TouchableOpacity>
        <Text style={styles.label}>{I18n.t('setting.changeCurrency')}</Text>
        <TouchableOpacity style={styles.btnSelect} onPress={() => setVisibleCurrencyModal(true)}>
          <Text style={[styles.selectValue, styles.lbCurrency]}>
            {currency ? currency.code : I18n.t('setting.selectCurrency')}
          </Text>
          <Image source={icArrowRight} style={styles.icArrowRight} />
        </TouchableOpacity>
        <Text style={styles.label}>{I18n.t('setting.tax')}</Text>
        <View style={styles.taxInput}>
          <TextInput
            placeholder={I18n.t('setting.inputTax')}
            isDarkMode={isDarkMode}
            value={tax}
            onChangeText={setTax}
            keyboardType="numeric"
          />
        </View>
        <Text style={styles.label}>{I18n.t('setting.name')}</Text>
        <View style={styles.nameInput}>
          <TextInput
            placeholder={I18n.t('setting.inputName')}
            isDarkMode={isDarkMode}
            value={name}
            onChangeText={setName}
          />
        </View>
        <ToggleSwitch
          isOn={isDarkMode}
          onColor="#E0E0E0"
          offColor="#E0E0E0"
          label={I18n.t('setting.darkTheme')}
          labelStyle={styles.label}
          thumbOnStyle={{ backgroundColor: '#33B9F7' }}
          thumbOffStyle={{ backgroundColor: '#33B9F7' }}
          size="medium"
          onToggle={handleToggleDarkMode}
        />
        <View style={styles.btnActionWrapper}>
          <ButtonLoading
            text={I18n.t('setting.btnChange')}
            loading={loading}
            style={styles.btnChange}
            styleText={styles.btnTextChange}
            onPress={onChangeConfig}
          />
        </View>
      </View>
      <View style={styles.rightView}>
        <View style={styles.btnActionWrapper}>
          <ButtonLoading
            text={I18n.t('printer.btnChange')}
            style={styles.btnChange}
            styleText={styles.btnTextChange}
            onPress={goToPrinters}
          />
        </View>
      </View>
      <ModalSelect
        visible={visibleLangModal}
        onRequestClose={() => setVisibleLangModal(false)}
        isDarkMode={isDarkMode}
        title={I18n.t('setting.titleModalLang')}
        data={languages}
        onSelect={onChangeLang}
        selected={language && language.value}
      />
      <ModalSelect
        visible={visibleCurrencyModal}
        onRequestClose={() => setVisibleCurrencyModal(false)}
        isDarkMode={isDarkMode}
        title={I18n.t('setting.titleModalCurrency')}
        data={Currencies.map(item => ({ label: item.name, value: item.code }))}
        onSelect={onChangeCurrency}
        selected={currency && currency.code}
      />
      <DropdownAlert ref={alertRef} updateStatusBar={false} />
    </View>
  );
};

export default Setting;
