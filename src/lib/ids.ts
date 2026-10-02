/**
 * Mock string id ↔ database UUID map
 * ----------------------------------
 * Mirrors supabase/seed.sql deterministic UUIDs.
 *
 * While screens still use mock ids ("1", "u1", "b1"), services can:
 *   toUuid("professional", "1")  → a1000000-…-0001
 *   toMockId("professional", uuid) → "1"
 *
 * On full API swap you can stop using mock ids and use UUID primary keys only.
 */

export const IDS = {
  user: {
    u1: "11111111-1111-1111-1111-111111111111",
    u2: "22222222-2222-2222-2222-222222222222",
    u3: "33333333-3333-3333-3333-333333333333",
    u4: "44444444-4444-4444-4444-444444444444",
    u5: "55555555-5555-5555-5555-555555555555",
    u6: "66666666-6666-6666-6666-666666666666",
    u7: "77777777-7777-7777-7777-777777777777",
    u11: "a1111111-1111-1111-1111-111111111111",
    p2: "b2000000-0000-0000-0000-000000000002",
    p3: "b2000000-0000-0000-0000-000000000003",
    p4: "b2000000-0000-0000-0000-000000000004",
    p5: "b2000000-0000-0000-0000-000000000005",
    p6: "b2000000-0000-0000-0000-000000000006",
  },
  professional: {
    "1": "a1000000-0000-0000-0000-000000000001",
    "2": "a1000000-0000-0000-0000-000000000002",
    "3": "a1000000-0000-0000-0000-000000000003",
    "4": "a1000000-0000-0000-0000-000000000004",
    "5": "a1000000-0000-0000-0000-000000000005",
    "6": "a1000000-0000-0000-0000-000000000006",
  },
  booking: {
    b1: "b1000000-0000-0000-0000-000000000001",
    b2: "b1000000-0000-0000-0000-000000000002",
    b3: "b1000000-0000-0000-0000-000000000003",
    r1: "b1000000-0000-0000-0000-000000000011",
    r2: "b1000000-0000-0000-0000-000000000012",
    r3: "b1000000-0000-0000-0000-000000000013",
  },
  serviceRequest: {
    "1": "c1000000-0000-0000-0000-000000000001",
    "2": "c1000000-0000-0000-0000-000000000002",
    "3": "c1000000-0000-0000-0000-000000000003",
    "4": "c1000000-0000-0000-0000-000000000004",
    "5": "c1000000-0000-0000-0000-000000000005",
    "6": "c1000000-0000-0000-0000-000000000006",
    "7": "c1000000-0000-0000-0000-000000000007",
    "11": "c1000000-0000-0000-0000-000000000011",
  },
  conversation: {
    c1: "d1000000-0000-0000-0000-000000000001",
    c2: "d1000000-0000-0000-0000-000000000002",
    c3: "d1000000-0000-0000-0000-000000000003",
    c4: "d1000000-0000-0000-0000-000000000004",
  },
  plan: {
    basic: "e1000000-0000-0000-0000-000000000001",
    pro: "e1000000-0000-0000-0000-000000000002",
  },
  verificationApplication: {
    "va-1": "f1000000-0000-0000-0000-000000000001",
    "va-2": "f1000000-0000-0000-0000-000000000002",
    "va-3": "f1000000-0000-0000-0000-000000000003",
    "va-4": "f1000000-0000-0000-0000-000000000004",
    "va-5": "f1000000-0000-0000-0000-000000000005",
    "va-6": "f1000000-0000-0000-0000-000000000006",
  },
} as const;

export type IdEntity = keyof typeof IDS;

/** Mock logged-in user (matches savedProviders MOCK_USER) */
export const MOCK_SESSION = {
  userMockId: "u1" as const,
  userUuid: IDS.user.u1,
  professionalMockId: "1" as const,
  professionalUuid: IDS.professional["1"],
};

function invert(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [mock, uuid] of Object.entries(map)) {
    out[uuid] = mock;
  }
  return out;
}

const UUID_TO_MOCK: Record<IdEntity, Record<string, string>> = {
  user: invert(IDS.user),
  professional: invert(IDS.professional),
  booking: invert(IDS.booking),
  serviceRequest: invert(IDS.serviceRequest),
  conversation: invert(IDS.conversation),
  plan: invert(IDS.plan),
  verificationApplication: invert(IDS.verificationApplication),
};

/**
 * Convert a mock string id to the seeded UUID.
 * If value already looks like a UUID, returns it unchanged.
 */
export function toUuid(entity: IdEntity, mockId: string): string {
  const key = String(mockId);
  if (isUuid(key)) return key;
  const map = IDS[entity] as Record<string, string>;
  const found = map[key];
  if (!found) {
    throw new Error(`Unknown mock id for ${entity}: ${mockId}`);
  }
  return found;
}

/** Convert a UUID back to mock id (for UI that still expects strings). */
export function toMockId(entity: IdEntity, uuid: string): string {
  const key = String(uuid);
  if (!isUuid(key)) return key;
  const found = UUID_TO_MOCK[entity][key];
  if (!found) {
    throw new Error(`Unknown uuid for ${entity}: ${uuid}`);
  }
  return found;
}

/** Safe lookup — returns undefined instead of throw. */
export function tryToUuid(
  entity: IdEntity,
  mockId: string,
): string | undefined {
  try {
    return toUuid(entity, mockId);
  } catch {
    return undefined;
  }
}

export function tryToMockId(
  entity: IdEntity,
  uuid: string,
): string | undefined {
  try {
    return toMockId(entity, uuid);
  } catch {
    return undefined;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Owner profile UUID for a professional mock id.
 * Pro "1" is owned by user u1; pros 2–6 by p2–p6.
 */
export function professionalOwnerUserUuid(proMockId: string): string {
  if (proMockId === "1") return IDS.user.u1;
  const ownerKey = `p${proMockId}` as keyof typeof IDS.user;
  const owner = IDS.user[ownerKey];
  if (!owner) {
    throw new Error(`No owner user for professional ${proMockId}`);
  }
  return owner;
}
