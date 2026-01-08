import { Utils } from '@common';

export const tabDailyConfigs = [
  { header: 'reports.time', property: 'createdAt' },
  { header: 'reports.customer', property: 'customer' },
  { header: 'reports.product', property: 'product' },
  { header: 'reports.quantity', property: 'quantity' },
  { header: 'reports.total', property: 'total', format: (value, currency) => { return Utils.formatCurrency(value, currency) } },
];

export const tableWeeklyConfigs = [
  { header: 'reports.days', property: 'day', comlumnStyle: { flex: 5 } },
  { header: 'reports.total', property: 'value', comlumnStyle: { flex: 1 }, format: (value, currency) => { return Utils.formatCurrency(value, currency) } },
]

export const tableMonthlyConfigs = [
  { header: 'reports.month', property: 'month', comlumnStyle: { flex: 5 } },
  { header: 'reports.total', property: 'value', comlumnStyle: { flex: 1 }, format: (value, currency) => { return Utils.formatCurrency(value, currency) } },
]

export const tableTopProductsConfigs = [
  { header: 'reports.product', property: 'name' },
  { header: 'reports.quantity', property: 'quantity' },
  { header: 'reports.total', property: 'amount', format: (value, currency) => { return Utils.formatCurrency(value, currency) } },
]

export const tabsConfig = [
  { tab: 'reports.dailySales', tabIndex: 0 },
  { tab: 'reports.weeklySales', tabIndex: 1 },
  { tab: 'reports.monthlySales', tabIndex: 2 },
  { tab: 'reports.topProducts', tabIndex: 3 },
]
