module.exports = {
  Role: {
    Manager: 'manager',
    Staff: 'staff',
    Admin: 'admin'
  },
  AuthType: {
    Email: 'email'
  },
  JWTSecret: '94rEvCERhR',
  DeviceOS: {
    Android: 'android',
    iOS: 'ios'
  },
  MediaType: {
    Image: 'image',
    Video: 'video'
  },
  FCMSenderKey:
    'AAAA7GQNkPA:APA91bEhmXmUwwxhRkk8GdN2pF6ZvTQI0lD6krmjEnUHl11-CjESeIepfeXHFk9GhI1O7k-fjB4ZfF1JvNWDn_r0KVN9UBFeJLzoYkyNv_-zkLy5p69HjEQeR6Ll5uxd2GuGQJMqlpkK',
  AutoLogin: false,
  CouponType: {
    Fixed: 'fixed',
    Percentage: 'percentage'
  },
  Currency: {
    USD: 'USD',
    VND: 'VND'
  },
  Language: {
    en: 'en',
    vi: 'vi'
  },
  SampleData: false,
  FileStorage: {
    server: {
      enabled: true,
      imageDirectory: 'public/images'
    },
    firebase: {
      enabled: false,
      storageBucket: 'pos-66e6c.appspot.com'
    }
  },
  DefaultProfileImage:
    'https://cdn1.vectorstock.com/i/1000x1000/77/30/default-avatar-profile-icon-grey-photo-placeholder-vector-17317730.jpg',
  DefaultProductImage: 'https://www.chanchao.com.tw/vietnamwood/images/default.jpg',
  LogTypes: {
    NewProduct: 'NewProduct',
    EditProduct: 'EditProduct',
    NewOrder: 'NewOrder'
  }
}
