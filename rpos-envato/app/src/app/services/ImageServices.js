import { get } from 'lodash';

import { Utils } from '@common';
import http from './http';

export default class ImageServices {

  static async uploadImage(fileData) {
    if (!fileData) {
      return null;
    }

    const dataReq = new FormData();
    if (!fileData.fileName) {
      let randomStr = Math.random().toString(36).substring(5) + '.jpg';
      fileData.fileName = randomStr;
    }

    dataReq.append('image', {
      uri: fileData.uri,
      type: 'image/jpeg',
      name: fileData.fileName
    });

    return new Promise((resolve, reject) => {
      http.post('/files/image', dataReq).then(({ data }) => {
        resolve(data);
      }).catch(error => {
        reject(error);
      });
    });
  }
}
