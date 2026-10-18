// exportedAt changes on every serialization and is not an edit.
export function fingerprint (payload) {
  const { exportedAt, headline, ...meta } = payload.meta || {}
  // An absent headline in an older file is equivalent to an empty one.
  if (headline) meta.headline = headline
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
