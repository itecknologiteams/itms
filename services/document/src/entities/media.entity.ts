import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export enum OwnerType {
  Driver = 'driver',
  Ride = 'ride',
  Admin = 'admin',
}

export enum MediaKind {
  License = 'license',
  Cnic = 'cnic',
  Photo = 'photo',
  Registration = 'registration',
  ReceiptPdf = 'receipt_pdf',
}

export enum ScanStatus {
  Pending = 'pending',
  Clean = 'clean',
  Infected = 'infected',
}

/** document_db.media (docs/data-model.md · 12 document/media). */
@Entity('media')
export class Media {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'owner_type', type: 'enum', enum: OwnerType })
  ownerType!: OwnerType;

  @Index()
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'enum', enum: MediaKind })
  kind!: MediaKind;

  @Column({ name: 'bucket_key' })
  bucketKey!: string;

  @Column()
  mime!: string;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes!: string | null;

  @Column({ type: 'varchar', nullable: true })
  sha256!: string | null;

  @Column({ name: 'scan_status', type: 'enum', enum: ScanStatus, default: ScanStatus.Pending })
  scanStatus!: ScanStatus;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy!: string;

  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
  finalizedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
