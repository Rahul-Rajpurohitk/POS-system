class PrinterInterface {
  async connect(portName, onSuccess, onFail) {}
  async scanDevices(onFinish) {}
  checkPrinterConnection(props, onSuccess) {}
  async printReceipt(params, settings) {}
}

export default PrinterInterface;
