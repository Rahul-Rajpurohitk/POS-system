export interface PrinterDevice {
  id: string;
  name: string;
  address: string;
  type: 'bluetooth' | 'wifi' | 'usb';
}

export interface ReceiptData {
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  orderNumber: string;
  date: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subTotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  footer?: string;
}

export interface PrinterService {
  scan(): Promise<PrinterDevice[]>;
  connect(device: PrinterDevice): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  printReceipt(data: ReceiptData): Promise<boolean>;
  printText(text: string): Promise<boolean>;
  openCashDrawer(): Promise<boolean>;
}
