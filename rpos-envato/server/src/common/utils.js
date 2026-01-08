import Constants from './constants'
import nodemailer from 'nodemailer'
import Config from './config.json'
const url = require('url')
const path = require('path')

const transporter = nodemailer.createTransport({
  host: Config.SMTP.host,
  port: Config.SMTP.port,
  auth: {
    user: Config.SMTP.username,
    pass: Config.SMTP.password
  }
})

export const response = (success = true, data = {}, message = '') => {
  if (success) {
    return {
      success,
      data
    }
  } else {
    return {
      success,
      message
    }
  }
}

export const randomFileNameByExtension = (extension) => {
  return Math.random().toString(36).substring(7) + extension
}

export const zeroPad = (num, places = 5) => {
  if (num.toString().length >= places) {
    return '#' + num
  } else {
    const zero = places - num.toString().length + 1
    return '#' + Array(+(zero > 0 && zero)).join('0') + num
  }
}

export const isDate = (date) => {
  return new Date(date) !== 'Invalid Date' && !isNaN(new Date(date))
}

export const getFileUrl = (fileName) => {
  if (!fileName) {
    return Constants.DefaultProfileImage
  }
  if (fileName.indexOf('http') > -1) {
    return fileName
  }
  if (Constants.FileStorage.server.enabled) {
    return process.env.DOMAIN + '/assets/' + fileName
  } else {
    return `https://firebasestorage.googleapis.com/v0/b/${Constants.FileStorage.firebase.storageBucket}/o/${fileName}?alt=media`
  }
}

export const getFileInfo = (image) => {
  let fileName = null
  let fileUrl = null
  if (image.indexOf('http') > -1) {
    const parsed = url.parse(image)
    if (image === getFileUrl(path.basename(parsed.pathname))) {
      fileName = path.basename(parsed.pathname)
    } else {
      fileUrl = image
    }
  } else {
    fileName = image
  }

  return { fileName, fileUrl }
}

export const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: Config.SMTP.username,
      to,
      subject,
      html
    })
  } catch (error) {
    console.log(error)
    throw error
  }
}

export const isUtcFormat = (date) => {
  return /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/.test(date)
}
