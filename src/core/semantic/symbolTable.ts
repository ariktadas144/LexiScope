export interface SymbolEntry { name: string; type: 'number' | 'boolean' | 'string'; value: string; scope: string; }
export class SymbolTable { private entries = new Map<string, SymbolEntry>(); declare(entry: SymbolEntry) { this.entries.set(entry.name, entry) } get(name: string) { return this.entries.get(name) } values() { return [...this.entries.values()] } }
