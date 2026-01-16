import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Business } from './Business.entity';
import { User } from './User.entity';

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

export interface ImportSummary {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: ImportRowError[];
  warnings: ImportRowError[];
}

@Entity('product_import_jobs')
@Index(['businessId', 'status'])
@Index(['businessId', 'createdAt'])
export class ProductImportJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'pending',
  })
  status!: ImportJobStatus;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_type', type: 'varchar', length: 20 })
  fileType!: string; // 'csv', 'xlsx'

  @Column({ name: 'file_size', type: 'integer', default: 0 })
  fileSize!: number;

  @Column({ name: 'total_rows', type: 'integer', default: 0 })
  totalRows!: number;

  @Column({ name: 'processed_rows', type: 'integer', default: 0 })
  processedRows!: number;

  @Column({ name: 'created_count', type: 'integer', default: 0 })
  createdCount!: number;

  @Column({ name: 'updated_count', type: 'integer', default: 0 })
  updatedCount!: number;

  @Column({ name: 'skipped_count', type: 'integer', default: 0 })
  skippedCount!: number;

  @Column({ name: 'failed_count', type: 'integer', default: 0 })
  failedCount!: number;

  @Column({
    name: 'duplicate_action',
    type: 'varchar',
    length: 20,
    default: 'skip',
  })
  duplicateAction!: DuplicateAction;

  @Column({
    name: 'column_mapping',
    type: 'jsonb',
    nullable: true,
  })
  columnMapping?: Record<string, string>; // { csvColumn: productField }

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  errors?: ImportRowError[];

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  warnings?: ImportRowError[];

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  results?: ImportRowResult[];

  @Column({
    name: 'created_product_ids',
    type: 'text',
    array: true,
    default: '{}',
  })
  createdProductIds!: string[]; // For rollback

  @Column({
    name: 'error_message',
    type: 'text',
    nullable: true,
  })
  errorMessage?: string;

  @Column({
    name: 'started_at',
    type: 'timestamptz',
    nullable: true,
  })
  startedAt?: Date;

  @Column({
    name: 'completed_at',
    type: 'timestamptz',
    nullable: true,
  })
  completedAt?: Date;

  @Column({
    name: 'rollback_at',
    type: 'timestamptz',
    nullable: true,
  })
  rollbackAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
