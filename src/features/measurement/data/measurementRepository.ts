import { isMeasurement, type Measurement } from '../../../shared/contracts/measurement';
import { createScopedCollectionRepository } from '../../../shared/storage/scopedCollectionRepository';
import { RETENTION_LIMITS } from '../../../shared/storage/retention';

export const measurementRepository = createScopedCollectionRepository<Measurement>({
  domain: 'history',
  kind: 'measurement-history',
  maxRecords: RETENTION_LIMITS.measurements,
  validate: isMeasurement,
});
