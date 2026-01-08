import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Business } from './Business.entity';
import { Role, AuthType } from '../types/enums';
import { Constants } from '../config/constants';

@Entity('users')
@Index(['email', 'authType'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100, default: '' })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, default: '' })
  lastName!: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  avatar!: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  email!: string;

  @Column({ type: 'enum', enum: Role, default: Role.MANAGER })
  role!: Role;

  @Column({ name: 'auth_type', type: 'enum', enum: AuthType, default: AuthType.EMAIL })
  authType!: AuthType;

  @Column({ name: 'reset_code', type: 'varchar', length: 10, default: '' })
  resetCode!: string;

  @Column({ type: 'varchar', length: 255, default: '', select: false })
  hash!: string;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: Business;

  // Password handling
  private tempPassword?: string;

  setPassword(password: string): void {
    this.tempPassword = password;
  }

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.tempPassword) {
      this.hash = await bcrypt.hash(this.tempPassword, Constants.SALT_ROUNDS);
      this.tempPassword = undefined;
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.hash);
  }

  // Get full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  // Sanitize for response (remove sensitive fields)
  toJSON(): Partial<User> {
    const { hash, resetCode, tempPassword, ...user } = this as any;
    return user;
  }
}
