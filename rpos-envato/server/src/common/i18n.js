const path = require('path')
const i18n = require('i18n')
i18n.configure({
  locales: ['en', 'cn', 'my', 'tn'],
  directory: path.join(__dirname, '../', 'locales'),
  queryParameter: 'lang',
  register: global,
  directoryPermissions: '755',
  defaultLocale: 'en',
  autoReload: true
})

module.exports = i18n
