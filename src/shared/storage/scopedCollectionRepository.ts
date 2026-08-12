import type { RuntimeValidator } from '../contracts/persistence';
import { createEnvelope, parseEnvelope } from '../contracts/persistence';
import { SafeStorage } from './SafeStorage';
import { keepLatestUnique, type TimestampedRecord } from './retention';
import { collaboratorStorageKey } from './storageKeys';

type CollectionDomain = 'history' | 'context_traces' | 'das21_history' | 'scale_history' | 'sleep_records';

interface CollectionRepositoryOptions<T extends TimestampedRecord & { collaboratorId: string }> {
  domain: CollectionDomain;
  kind: string;
  maxRecords?: number;
  retain?: (records: T[]) => T[];
  validate: RuntimeValidator<T>;
}

export function createScopedCollectionRepository<T extends TimestampedRecord & { collaboratorId: string }>(
  options: CollectionRepositoryOptions<T>,
) {
  if (options.maxRecords === undefined && !options.retain) {
    throw new Error('A coleção precisa definir uma política de retenção.');
  }

  const validateCollection: RuntimeValidator<T[]> = (value): value is T[] => (
    Array.isArray(value) && value.every(options.validate)
  );

  function keyFor(collaboratorId: string) {
    return collaboratorStorageKey(options.domain, collaboratorId);
  }

  function read(collaboratorId: string): T[] {
    const raw = SafeStorage.getItem(keyFor(collaboratorId));
    if (!raw) return [];
    const envelope = parseEnvelope(raw, {
      kind: options.kind,
      collaboratorId,
      validate: validateCollection,
    });
    if (!envelope) return [];
    if (envelope.data.some((item) => item.collaboratorId !== collaboratorId)) return [];
    return envelope.data;
  }

  function write(collaboratorId: string, records: T[]) {
    if (records.some((item) => item.collaboratorId !== collaboratorId || !options.validate(item))) {
      throw new Error('A coleção contém registros inválidos ou de outro colaborador.');
    }
    const retained = options.retain
      ? options.retain(records)
      : keepLatestUnique(records, options.maxRecords!);
    if (retained.some((item) => item.collaboratorId !== collaboratorId || !options.validate(item))) {
      throw new Error('A política de retenção produziu uma coleção inválida.');
    }
    const persistence = SafeStorage.setItem(
      keyFor(collaboratorId),
      JSON.stringify(createEnvelope(options.kind, collaboratorId, retained)),
    );
    if (persistence !== 'durable') {
      throw new Error('Não foi possível salvar os registros de forma permanente neste dispositivo.');
    }
    return retained;
  }

  return {
    list: read,
    replace: write,
    add(collaboratorId: string, record: T) {
      return write(collaboratorId, [...read(collaboratorId), record]);
    },
    clear(collaboratorId: string) {
      SafeStorage.removeItem(keyFor(collaboratorId));
    },
  };
}
