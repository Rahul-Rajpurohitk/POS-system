import React from 'react'
import { TouchableOpacity, Text } from 'react-native'
import I18n from '@common/I18n'
import { useDynamicStyleSheet } from 'react-native-dark-mode'
import { styles as dynamicStyles } from './styles'

const ButtonBack = (props) => {
  const { onPress } = props
  const styles = useDynamicStyleSheet(dynamicStyles)
  return (
    <TouchableOpacity
      style={styles.btnBack}
      activeOpacity={0.6}
      onPress={onPress}>
      <Text style={styles.lbBack}>{I18n.t('register.back')}</Text>
    </TouchableOpacity>
  )
}

export default ButtonBack