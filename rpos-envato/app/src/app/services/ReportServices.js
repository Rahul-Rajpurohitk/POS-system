import http from './http';

const formatOrder = (order) => {
  const items = order.items.map((item) => ({
    id: item._id,
    product: {
      id: item.product._id,
      name: item.product.name,
      sellingPrice: item.product.sellingPrice,
      purchasePrice: item.product.purchasePrice,
    },
    quantity: item.quantity,
  }));

  return {
    payment: {
      subTotal: order.payment.subTotal,
      discount: order.payment.discount,
      total: order.payment.total
    },
    number: order.number,
    id: order._id,
    customer: {
      name: order.customer.name,
      id: order.customer._id,
    },
    items,
    createdBy: order.createdBy,
    createdAt: order.createdAt,
  }
}

export default class Report {

  static getTopProducts() {
    return new Promise((resolve, reject) => {
      http.get('/reports/products').then(({ data }) => {
        const products = data.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          amount: item.amount,
          profit: item.profit,
          id: item._id
        }));
        resolve({ data: products });
      }).catch(error => {
        reject(error);
      });
    });
  }

  static getReportDaily() {
    const date = new Date();
    return new Promise((resolve, reject) => {
      http.get(`/reports/daily?date=${date}`).then(({ data }) => {
        const dataReport = data.map(item => formatOrder(item))
        resolve({ data: dataReport });
      }).catch(error => {
        reject(error);
      });
    });
  }

  static getReportMonthly() {
    return new Promise((resolve, reject) => {
      http.get('/reports/monthly').then(({ data }) => {
        resolve({ data: Object.values(data) });
      }).catch(error => {
        reject(error);
      });
    });
  }

  static getReportWeekly() {
    return new Promise((resolve, reject) => {
      http.get('/reports/weekly').then(({ data }) => {
        resolve({ data: Object.values(data) });
      }).catch(error => {
        reject(error);
      });
    });
  }
}
