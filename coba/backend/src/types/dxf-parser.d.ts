declare module 'dxf-parser' {
  export default class DxfParser {
    parseSync(source: string): DxfDocument
  }
  interface DxfDocument { entities: Entity[]; header?: Record<string, unknown> }
  interface Entity { type: string; handle?: string; layer?: string; [key: string]: unknown }
}
