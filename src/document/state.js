// exportedAt changes on every serialization and is not an edit.
export function fingerprint (payload) {
  const { exportedAt, ...meta } = payload.meta || {}
  return JSON.stringify({ ...payload, meta })
}

export class DocumentState {
  constructor (source, name, payload, file = null) {
    this.source = source
    this.name = name
    this.file = file
    this.saved = fingerprint(payload)
  }

  isDirty (payload) {
    return this.saved !== fingerprint(payload)
  }
}
