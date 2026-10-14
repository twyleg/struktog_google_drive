// Validate before the existing importer mutates the editor or persisted settings.
export function validDiagram (data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  if (data.formatVersion !== undefined && data.formatVersion !== 2) return false
  const object = value => value && typeof value === 'object' && !Array.isArray(value)
  if (data.settings !== undefined && data.settings !== null) {
    if (!object(data.settings)) return false
    const settings = data.settings
    for (const key of ['elements', 'colors']) {
      if (settings[key] !== undefined && !object(settings[key])) return false
    }
    for (const key of ['profile', 'language', 'uiLanguage']) {
      if (settings[key] !== undefined && typeof settings[key] !== 'string') return false
    }
    if (settings.uiLanguage !== undefined && !['auto', 'de', 'en', 'fr', 'es'].includes(settings.uiLanguage)) return false
    if (['__proto__', 'constructor', 'toString'].includes(settings.profile)) return false
  }
  const tree = Object.hasOwn(data, 'tree') ? data.tree : data
  const children = {
    Placeholder: [],
    InsertNode: ['followElement'],
    InsertCase: ['followElement'],
    InputNode: ['followElement'],
    OutputNode: ['followElement'],
    TaskNode: ['followElement'],
    BlockCallNode: ['followElement'],
    HeadLoopNode: ['followElement', 'child'],
    FootLoopNode: ['followElement', 'child'],
    CountLoopNode: ['followElement', 'child'],
    FunctionNode: ['followElement', 'child'],
    BranchNode: ['followElement', 'trueChild', 'falseChild'],
    CaseNode: ['followElement', 'defaultNode'],
    TryCatchNode: ['followElement', 'tryChild']
  }
  const seen = new Set()
  function visit (node, depth) {
    if (node === null) return true
    if (!node || typeof node !== 'object' || Array.isArray(node) || depth > 500 || seen.has(node)) return false
    seen.add(node)
    if (typeof node.type !== 'string' || !Object.hasOwn(children, node.type)) return false
    if (node.type !== 'Placeholder' && typeof node.id !== 'string') return false
    if (!['Placeholder', 'InsertNode', 'TryCatchNode'].includes(node.type) && typeof node.text !== 'string') return false
    if (node.text !== undefined && typeof node.text !== 'string') return false
    if (node.type === 'FunctionNode' && (!Array.isArray(node.parameters) || node.parameters.some(p => !p || typeof p.parName !== 'string'))) return false
    for (const key of children[node.type]) {
      if (!visit(node[key], depth + 1)) return false
    }
    for (const [type, key] of [['CaseNode', 'cases'], ['TryCatchNode', 'catches']]) {
      if (node.type === type && (!Array.isArray(node[key]) || node[key].length === 0 || !node[key].every(child => child !== null && visit(child, depth + 1)))) return false
    }
    return true
  }
  return tree !== null && visit(tree, 0)
}
