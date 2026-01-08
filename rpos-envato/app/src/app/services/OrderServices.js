import http from './http';

const formatOrder = (order) => {
  const items = order.items.map((item) => ({
    id: item._id,
    product: {
      id: item.product._id,
      name: item.product.name,
      sku: item.product.sku,
      images: item.product.images,
      desc: item.product.desc,
      quantity: item.product.quantity,
      sellingPrice: item.product.sellingPrice,
      purchasePrice: item.product.purchasePrice,
      category: item.product.category,
    },
    quantity: item.quantity,
  }));

  let data = {
    payment: {
      subTotal: order.payment.subTotal,
      discount: order.payment.discount,
      total: order.payment.total
    },
    number: order.number,
    id: order._id,
    items,
    createdBy: order.createdBy,
    createdAt: order.createdAt,
  }

  if (order.coupon) {
    data.coupon = {
      code: order.coupon.code,
      name: order.coupon.name,
      type: order.coupon.type,
      amount: order.coupon.amount,
      id: order.coupon._id,
    }
  }
  if (order.customer) {
    data.customer = {
      name: order.customer.name,
      avatar: order.customer.avatar,
      email: order.customer.email,
      phone: order.customer.phone,
      address: order.customer.address,
      id: order.customer._id,
    }
  }

  return data;
}

export default class Order {
  static getAllOrders() {
    return new Promise((resolve, reject) => {
      http.get('/orders/sync').then(({ data }) => {
        const orders = data.map((item) => formatOrder(item));
        resolve({ data: orders });
      }).catch(error => {
        reject(error);
      });
    });
  }

  static addOrder(body) {
    return new Promise((resolve, reject) => {
      http.post('/orders', body).then(({ data }) => {
        const items = data.items.map((item) => ({
          id: item._id,
          product: {
            id: item.product,
            quantity: item.quantity,
          }
        }));
        const order = {
          customer: data.customer,
          createdBy: data.createdBy,
          createdAt: data.createdAt,
          payment: {
            subTotal: data.payment.subTotal,
            discount: data.payment.discount,
            total: data.payment.total
          },
          coupon: data.coupon,
          number: data.number,
          id: data._id,
          items,
        };
        resolve({ data: order });
      }).catch(error => {
        reject(error);
      });
    });
  }
}
