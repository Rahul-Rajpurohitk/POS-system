/* eslint-disable no-useless-catch */
import _ from 'lodash'
import randomstring from 'randomstring'
import Services from '../services/index'
const Category = require('../models/category')
const Product = require('../models/product')
const Coupon = require('../models/coupon')
const Customer = require('../models/customer')

const Constants = require('../common/constants')
const faker = require('faker')

function getRandomInt (max) {
  return Math.floor(Math.random() * Math.floor(max))
}

const generateCategories = async (business) => {
  const categories = ['Food', 'Sport', 'Trend', 'Travel', 'Education']
  const items = []
  for (let i = 0; i < categories.length; i++) {
    const obj = {
      code: randomstring.generate(7).toUpperCase(),
      name: categories[i],
      image: faker.image.image(),
      business
    }
    items.push(new Category(obj))
  }
  return Category.collection.insertMany(items)
}

const generateProducts = async (business) => {
  try {
    const categories = await Category.find({ business })
    if (categories && categories.length > 0) {
      const items = []
      for (let i = 0; i < categories.length; i++) {
        for (let j = 0; j < 30; j++) {
          const price = faker.commerce.price()
          const obj = {
            name: faker.commerce.productName(),
            sku: randomstring.generate(7).toUpperCase(),
            category: categories[i],
            desc: faker.lorem.paragraphs(),
            quantity: getRandomInt(100) + 100,
            sellingPrice: price * 1.2.toFixed(2),
            purchasePrice: price,
            images: [faker.image.image()],
            business
          }
          items.push(new Product(obj))
        }
      }

      return Product.collection.insertMany(items)
    } else {
      return
    }
  } catch (error) {
    throw error
  }
}

const generateCoupon = async (business) => {
  const items = []
  const coupons = Object.values(Constants.CouponType)
  for (let i = 0; i < 10; i++) {
    const obj = {
      code: randomstring.generate(7).toUpperCase(),
      name: faker.name.title(),
      amount: getRandomInt(100),
      type: coupons[Math.floor(Math.random() * coupons.length)],
      business
    }
    items.push(new Coupon(obj))
  }
  return Coupon.collection.insertMany(items)
}

const generateCustomer = async (business) => {
  const items = []
  for (let i = 0; i < 50; i++) {
    const obj = {
      name: faker.name.findName(),
      email: faker.internet.email(),
      phone: faker.phone.phoneNumber(),
      address: faker.address.streetAddress(),
      avatar: faker.image.avatar(),
      business
    }
    items.push(new Customer(obj))
  }
  return Customer.collection.insertMany(items)
}

const generateOrder = async (business, userId) => {
  try {
    let products = await Product.find({ business })
    products = _.map(products, '_id')

    let customers = await Customer.find({ business })
    customers = _.map(customers, '_id')

    let coupons = await Coupon.find({ business })
    coupons = _.map(coupons, '_id')

    if (products && customers && coupons) {
      const orders = []
      for (let j = 0; j < 100; j++) {
        const customer = customers[Math.floor(Math.random() * customers.length)]
        const coupon = coupons[Math.floor(Math.random() * coupons.length)]
        const items = []
        for (let index = 0; index < getRandomInt(4) + 1; index++) {
          items.push({ product: products[Math.floor(Math.random() * products.length)], quantity: getRandomInt(9) + 1 })
        }
        await Services.order.createOrder({ coupon, customer, items, business, createdBy: userId }, (err, item) => {

        })
      }
    }
    return
  } catch (error) {
    throw error
  }
}

export default {
  generateData: async (business, userId) => {
    try {
      await generateCategories(business)
      await generateProducts(business)
      await generateCustomer(business)
      await generateCoupon(business)
      await generateOrder(business, userId)
      return
    } catch (error) {
      throw error
    }
  }
}
