import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export enum DocumentType {
  License = 'license',
  Cnic = 'cnic',
  Photo = 'photo',
  Registration = 'registration',
}

export enum DocumentReviewStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

/** driver_db.driver_documents (docs/data-model.md · 03 driver_db). */
@Entity('driver_documents')
export class DriverDocument {
  @PrimaryColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @Column({ type: 'enum', enum: DocumentType })
  type!: DocumentType;

  @Column({ name: 'media_id', type: 'uuid' })
  mediaId!: string;

  @Column({ type: 'enum', enum: DocumentReviewStatus, default: DocumentReviewStatus.Pending })
  status!: DocumentReviewStatus;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
