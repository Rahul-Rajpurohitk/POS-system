export type ImportJobStatus =
  | 'pending'
  | 'validating'
  | 'validated'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rolled_back';

export type DuplicateAction = 'skip' | 'update' | 'create_new';

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ImportRowResult {
  row: number;
  status: 'created' | 'updated' | 'skipped' | 'failed';
  productId?: string;
  sku?: string;
  name?: string;
  error?: string;
}

export interface ImportJob {
  id: string;
  businessId: string;
  status: ImportJobStatus;
  fileName: string;
  fileType: string;
  fileSize: number;
  totalRows: number;
  processedRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  duplicateAction: DuplicateAction;
  columnMapping?: Record<string, string>;
  errors?: ImportRowError[];
  warnings?: ImportRowError[];
  results?: ImportRowResult[];
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  rollbackAt?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ImportRowError[];
  warnings: ImportRowError[];
  validRows: number;
  totalRows: number;
}

export interface DuplicateInfo {
  row: number;
  matchField: 'sku' | 'barcode' | 'name';
  matchValue: string;
  existingProduct: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface ImportSummary {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface ValidateResponse {
  fileName: string;
  fileType: string;
  fileSize: number;
  totalRows: number;
  headers: string[];
  columnMapping: Record<string, string>;
  suggestedMapping: Record<string, string>;
  validation: ValidationResult;
  sampleData: Record<string, string | number>[];
}

export interface DuplicateCheckResponse {
  totalRows: number;
  duplicateCount: number;
  uniqueCount: number;
  duplicates: DuplicateInfo[];
}

export interface ImportResponse {
  jobId: string;
  status: ImportJobStatus;
  summary: ImportSummary;
  warnings?: ImportRowError[];
  errors?: ImportRowError[];
  completedAt?: string;
}

export interface ImportHistoryResponse {
  jobs: ImportJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Wizard step state
export type ImportWizardStep = 'upload' | 'mapping' | 'preview' | 'duplicates' | 'importing' | 'results';

export interface ImportWizardState {
  step: ImportWizardStep;
  file: File | null;
  headers: string[];
  columnMapping: Record<string, string>;
  validationResult: ValidationResult | null;
  sampleData: Record<string, string | number>[];
  duplicates: DuplicateInfo[];
  duplicateAction: DuplicateAction;
  importJob: ImportJob | null;
  isLoading: boolean;
  error: string | null;
}

// Available product fields for mapping
export const PRODUCT_FIELDS = [
  { value: 'name', label: 'Product Name', required: true },
  { value: 'sku', label: 'SKU' },
  { value: 'barcode', label: 'Barcode (UPC/EAN)' },
  { value: 'description', label: 'Description' },
  { value: 'categoryName', label: 'Category' },
  { value: 'brand', label: 'Brand' },
  { value: 'sellingPrice', label: 'Selling Price', required: true },
  { value: 'purchasePrice', label: 'Purchase Price' },
  { value: 'quantity', label: 'Stock Quantity' },
  { value: 'taxClass', label: 'Tax Class' },
  { value: 'unitOfMeasure', label: 'Unit of Measure' },
  { value: 'weight', label: 'Weight' },
  { value: 'weightUnit', label: 'Weight Unit' },
  { value: 'tags', label: 'Tags' },
] as const;

export type ProductFieldKey = typeof PRODUCT_FIELDS[number]['value'];
