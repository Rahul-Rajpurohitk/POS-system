import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Currency, Language } from '../types/enums';

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  name!: string;

  @Column({ type: 'enum', enum: Currency, default: Currency.USD })
  currency!: Currency;

  @Column({ type: 'enum', enum: Language, default: Language.EN })
  language!: Language;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  tax!: number;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations will be added after other entities are defined
  // to avoid circular dependency issues during initial setup
}
