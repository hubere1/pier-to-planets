/** Aktuelle Save-Schema-Version. Jede Änderung: +1, Migration, Fixture (AGENTS Regel 9). */
export const SAVE_SCHEMA_VERSION = 1;

/** Kopf der Spielstand-Datei (docs/04 § Save). */
export interface SaveHeader {
  schemaVersion: number;
  /** SHA-256 (hex) über `JSON.stringify(payload)`. */
  checksum: string;
  savedAtWallMs: number;
  appVersion: string;
}

export interface SaveFile extends SaveHeader {
  payload: unknown;
}
