import { useState, useRef } from 'react'
import { Constants } from '@common'
import I18n from '@common/I18n'
import validator from 'validator'
import UserServices from '@services/UserServices'
const { CLOSE_INTERVAL_ALERT_ERROR } = Constants

const ForgotPasswordHook = (navigation) => {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [tokenReset, setTokenReset] = useState(null)
  const dropdownAlertRef = useRef('')

  const onForgotPassword = () => {
    if (validator.isEmpty(email)) {
      return showMessageError(I18n.t('forgotPassword.inputtEmail'))
    }
    if (!validator.isEmail(email)) {
      return showMessageError(I18n.t('forgotPassword.emailInvalid'))
    }
    setRequesting(true)
    setTokenReset(null)
    UserServices.forgotPassword(email)
      .then(res => {
        const { message, token } = res
        setTokenReset(token)
        setEmail('')
        showMessage('info', 'Info', message, 30000)
      })
      .catch(error => {
        showMessageError(error)
      })
      .finally(() => {
        setRequesting(false)
      })
  }

  const showMessageError = (message) => {
    showMessage('error', 'Error', message)
  }

  const showMessage = (type, title, msg, timeout = CLOSE_INTERVAL_ALERT_ERROR) => {
    dropdownAlertRef.current.alertWithType(
      type,
      title,
      msg,
      {},
      timeout,
    )
  }

  const onResetPassword = () => {
    if (validator.isEmpty(code)) {
      return showMessageError(I18n.t('forgotPassword.inputCode'))
    }
    if (validator.isEmpty(password)) {
      return showMessageError(I18n.t('forgotPassword.inputPassword'))
    }
    setRequesting(true)
    UserServices.resetPassword({ code, token: tokenReset, password })
      .then(() => {
        showMessage('info', 'Info', I18n.t('forgotPassword.resetSuccess'))
        setTimeout(() => {
          navigation.goBack()
        }, 2000)
      })
      .catch(error => {
        showMessageError(error)
      })
      .finally(() => {
        setRequesting(false)
      })
  }

  return {
    setEmail,
    dropdownAlertRef,
    onForgotPassword,
    loading: requesting,
    tokenReset,
    setCode,
    setPassword,
    email,
    code,
    password,
    onResetPassword
  }
}

export default ForgotPasswordHook