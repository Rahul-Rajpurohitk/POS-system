import { DeviceEventEmitter, NativeEventEmitter, Platform } from 'react-native';
import { get } from 'lodash';
import { BluetoothManager, BluetoothEscposPrinter } from 'react-native-bluetooth-escpos-printer';
var Global = require('../Global');
import Constants from '../Constants';
import Utils from '../Utils';
import moment from 'moment';
import PrinterInterface from './PrinterInterface';

class PrinterManagement extends PrinterInterface {
  _listeners = [];
  isConnecting = false;
  address = null;

  constructor() {
    super();
    if (Platform.OS === 'ios') {
      let bluetoothManagerEmitter = new NativeEventEmitter(BluetoothManager);
      this._listeners.push(
        bluetoothManagerEmitter.addListener(BluetoothManager.EVENT_CONNECTED, rsp => {
          console.log('EVENT_CONNECTED: ', rsp.device);
          this.connectedDevice = {
            address: this.address,
            name: rsp.device.device_name,
          };
        }),
      );
      this._listeners.push(
        bluetoothManagerEmitter.addListener(BluetoothManager.EVENT_CONNECTION_LOST, () => {
          setTimeout(() => {
            this.connectedDevice &&
              this.connect(
                this.connectedDevice.address,
                () => {},
                err => {},
              );
          }, 3000);
        }),
      );

      this._listeners.push(
        bluetoothManagerEmitter.addListener(BluetoothManager.EVENT_DEVICE_FOUND, rsp => {
          Global.EventEmitter.emit(Constants.EVENT_DEVICE_FOUND, rsp.device);
        }),
      );
      this._listeners.push(
        bluetoothManagerEmitter.addListener(BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED, rsp => {
          console.log('EVENT_DEVICE_ALREADY_PAIRED: ', rsp);
          Global.EventEmitter.emit(Constants.EVENT_DEVICE_ALREADY_PAIRED, rsp.devices);
        }),
      );
    } else if (Platform.OS === 'android') {
      this._listeners.push(
        DeviceEventEmitter.addListener(BluetoothManager.EVENT_CONNECTED, rsp => {
          console.log('EVENT_CONNECTED: ', rsp);
          this.connectedDevice = {
            address: this.address,
            name: rsp.device.device_name,
          };
        }),
      );
      this._listeners.push(
        DeviceEventEmitter.addListener(BluetoothManager.EVENT_CONNECTION_LOST, () => {
          setTimeout(() => {
            this.connectedDevice &&
              this.connect(
                this.connectedDevice,
                () => {},
                err => {},
              );
          }, 3000);
        }),
      );
      this._listeners.push(
        DeviceEventEmitter.addListener(BluetoothManager.EVENT_DEVICE_FOUND, rsp => {
          Global.EventEmitter.emit(Constants.EVENT_DEVICE_FOUND, JSON.parse(rsp.device));
        }),
      );
      this._listeners.push(
        DeviceEventEmitter.addListener(BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED, rsp => {
          if (rsp.devices && rsp.devices.length > 0) {
            const devices = JSON.parse(rsp.devices);
            Global.EventEmitter.emit(Constants.EVENT_DEVICE_ALREADY_PAIRED, devices);
          }
        }),
      );
    }
  }

  removeAllListeners() {
    for (let ls in this._listeners) {
      Global.EventEmitter.removeEventListener(this._listeners[ls]);
    }
  }

  connect(address, onSuccess, onFail) {
    if (!this.isConnecting) {
      this.isConnecting = true;
      this.address = address;
      BluetoothManager.connect(`${address}`)
        .then(r => {
          this.isConnecting = false;
          this.connectedDevice = { address };
          onSuccess();
        })
        .catch(err => {
          this.isConnecting = false;
          onFail(err);
        });
    } else {
      alert('The printer is connecting....');
    }
  }

  scanDevices(onFinish) {
    setTimeout(() => {
      onFinish();
    }, 30 * 1000);

    BluetoothManager.scanDevices().then(
      s => {
        var ss = JSON.parse(s);
        var found = ss.found;
        var paired = ss.paired;
        if (found && found.length) {
          Global.EventEmitter.emit(Constants.EVENT_DEVICE_FOUND, found);
        }
        if (paired && paired.length) {
          Global.EventEmitter.emit(Constants.EVENT_DEVICE_ALREADY_PAIRED, paired);
        }
        onFinish();
      },
      er => {
        BluetoothManager.scanDevices().then(
          s => {
            var ss = s;
            var found = ss.found;
            try {
              found = JSON.parse(found); //@FIX_it: the parse action too weired..
            } catch (e) {
              //ignore
            }
            if (found && found.length) {
              Global.EventEmitter.emit(Constants.EVENT_DEVICE_FOUND, found);
            }
            onFinish();
          },
          er => {
            onFinish();
          },
        );
      },
    );
  }

  setConnectedDevice(device) {
    this.connectedDevice = device;
  }

  checkPrinterConnection = (props, onSuccess) => {
    const { connectedDevice } = props;

    if (connectedDevice && connectedDevice.address) {
      if (this.connectedDevice) {
        onSuccess();
      } else {
        this.connect(
          connectedDevice.address,
          () => {
            onSuccess();
          },
          err => {
            alert(err);
          },
        );
      }
    } else {
      alert('No printer device. Go to settings to setup your printer.');
    }
  };

  async printReceipt(params, settings, currency) {
    try {
      const optionsTxt = {};
      const { order } = params;
      const subTotal = get(order, 'payment.subTotal', 0);
      const total = get(order, 'payment.total', 0);
      const discount = get(order, 'payment.discount', 0);

      await BluetoothEscposPrinter.printerInit();
      await BluetoothEscposPrinter.printerLeftSpace(0);
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.printText(settings.name + '\r\n', optionsTxt);
      await BluetoothEscposPrinter.printText('--------------------------------\n\r', {});

      let columnWidths2 = [20, 12];
      await BluetoothEscposPrinter.printColumn(
        [6, 26],
        [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT],
        ['Time', moment().format('lll')],
        {},
      );
      await BluetoothEscposPrinter.printColumn(
        columnWidths2,
        [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT],
        ['Order', order.number],
        {},
      );
      await BluetoothEscposPrinter.printText('--------------------------------\n\r', {});

      let columnWidths = [16, 6, 10];
      await BluetoothEscposPrinter.printColumn(
        columnWidths,
        [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.CENTER, BluetoothEscposPrinter.ALIGN.RIGHT],
        ['Items', 'Qty', 'Amount'],
        {},
      );

      var count = 0;
      const printItem = async (item, onFinish) => {
        await BluetoothEscposPrinter.printColumn(
          columnWidths,
          [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.CENTER, BluetoothEscposPrinter.ALIGN.RIGHT],
          [
            item.product.name,
            JSON.stringify(item.quantity),
            Utils.formatCurrency(get(item, 'product.sellingPrice', 0), currency),
          ],
          optionsTxt,
        );

        count += 1;
        if (count < order.items.length) {
          await printItem(order.items[count], onFinish);
        } else {
          onFinish();
        }
      };

      await BluetoothEscposPrinter.printText('--------------------------------\n\r', {});

      await printItem(order.items[0], async () => {
        await BluetoothEscposPrinter.printText('\n\r', {});
        await BluetoothEscposPrinter.printText('--------------------------------\n\r', {});
        await BluetoothEscposPrinter.printColumn(
          columnWidths2,
          [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT],
          ['Subtotal', Utils.formatCurrency(subTotal, currency)],
          {},
        );
        if (!!discount) {
          await BluetoothEscposPrinter.printColumn(
            columnWidths2,
            [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT],
            ['Discount', '-' + Utils.formatCurrency(discount, currency)],
            {},
          );
        }

        await BluetoothEscposPrinter.setBlob(0);
        await BluetoothEscposPrinter.printColumn(
          columnWidths2,
          [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT],
          ['Total', Utils.formatCurrency(total, currency)],
          {},
        );

        await BluetoothEscposPrinter.printText('\n\r', {});
        await BluetoothEscposPrinter.printText('\n\r', {});
      });
    } catch (e) {
      alert(e);
    }
  }
}

module.exports = PrinterManagement;
