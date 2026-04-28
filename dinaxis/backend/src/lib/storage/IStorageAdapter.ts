export interface IStorageAdapter {
  /** Save a file. Returns a storage key. */
  save(filename: string, data: Buffer, mimeType: string): Promise<string>
  /** Get raw file bytes by storage key. */
  get(key: string): Promise<Buffer>
  /** Get a URL to serve/view the file. */
  getServeUrl(key: string): Promise<string>
  /** Delete a file by storage key. */
  delete(key: string): Promise<void>
}
