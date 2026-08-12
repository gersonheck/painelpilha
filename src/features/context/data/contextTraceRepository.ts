import { isContextTrace, type ContextTrace } from '../../../shared/contracts/contextTrace';
import { createScopedCollectionRepository } from '../../../shared/storage/scopedCollectionRepository';
import {
  retainContextTraces,
  type ContextTracePlan,
} from '../../../shared/storage/retention';

export function createContextTraceRepository(plan: ContextTracePlan = 'free') {
  return createScopedCollectionRepository<ContextTrace>({
    domain: 'context_traces',
    kind: 'context-traces',
    retain: (records) => retainContextTraces(records, plan),
    validate: isContextTrace,
  });
}

export const contextTraceRepository = createContextTraceRepository();
