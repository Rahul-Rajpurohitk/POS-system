import React from 'react'
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native'

const ButtonLoading = (props) => {
  const {
    loading,
    text,
    styleText,
    style,
    onPress
  } = props
  return (
    <TouchableOpacity
      disabled={loading}
      style={style}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {
        loading ? <ActivityIndicator size="small" color="#FFF" />
          : <Text style={styleText}>{text}</Text>
      }
    </TouchableOpacity>
  )
}

export default ButtonLoading