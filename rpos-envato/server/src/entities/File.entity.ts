import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { MediaType } from '../types/enums';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: MediaType, default: MediaType.IMAGE })
  type!: MediaType;

  @Column({ type: 'varchar', length: 500, default: '' })
  path!: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255, default: '' })
  originalName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, default: '' })
  mimeType!: string;

  @Column({ type: 'integer', default: 0 })
  size!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Get full URL (can be extended to support different storage providers)
  getUrl(baseUrl?: string): string {
    if (this.path.startsWith('http')) {
      return this.path;
    }
    return baseUrl ? `${baseUrl}/${this.path}` : this.path;
  }
}
