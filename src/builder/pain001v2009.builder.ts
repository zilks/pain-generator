// ============================================================
// PAIN.001 v2009 Builder
// Schema: pain.001.001.03.ch.02.xsd
// ============================================================

import { ResolvedPain001Request } from '../types/pain001.types';
import { buildPain001Xml, SchemaConfig } from './pain001.builder.base';

const SCHEMA_V2009: SchemaConfig = {
  namespace: 'http://www.six-interbank-clearing.com/de/pain.001.001.03.ch.02.xsd',
  schemaLocation: 'pain.001.001.03.ch.02.xsd',
};

export function buildV2009(req: ResolvedPain001Request): string {
  return buildPain001Xml(req, SCHEMA_V2009);
}

