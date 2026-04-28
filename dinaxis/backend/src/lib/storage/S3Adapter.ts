import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import type { IStorageAdapter } from './IStorageAdapter'

export class S3Adapter implements IStorageAdapter {
  private client: S3Client
  private bucket: string

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? ''
    this.client = new S3Client({ region: process.env.S3_REGION ?? 'us-east-1' })
  }

  async save(filename: string, data: Buffer, mimeType: string): Promise<string> {
    const key = `documents/${randomUUID()}-${filename}`
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: mimeType,
    }))
    return key
  }

  async get(key: string): Promise<Buffer> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    const res = await this.client.send(cmd)
    const chunks: Buffer[] = []
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  async getServeUrl(key: string): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    return getSignedUrl(this.client, cmd, { expiresIn: 900 }) // 15 min
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }
}
