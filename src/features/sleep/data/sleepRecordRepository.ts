import { isSleepRecord, type SleepRecord } from '../../../shared/contracts/sleep';
import { createScopedCollectionRepository } from '../../../shared/storage/scopedCollectionRepository';
import { RETENTION_LIMITS } from '../../../shared/storage/retention';

export const sleepRecordRepository = createScopedCollectionRepository<SleepRecord>({
  domain: 'sleep_records',
  kind: 'sleep-records',
  maxRecords: RETENTION_LIMITS.sleepRecords,
  validate: isSleepRecord,
});
