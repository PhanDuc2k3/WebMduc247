import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { setTimeout as delay } from 'node:timers/promises';

export class AvatarStorage {
  constructor(config) {
    this.bucket = config.bucket;
    const common = { region: config.region, forcePathStyle: Boolean(config.endpoint), credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey } };
    this.client = new S3Client({ ...common, endpoint: config.endpoint || undefined });
    this.publicClient = new S3Client({ ...common, endpoint: config.publicEndpoint || config.endpoint || undefined });
    this.autoCreateBucket = config.autoCreateBucket;
  }
  async ensureBucket() {
    for (let attempt = 0; attempt < 15; attempt++) {
      try { await this.client.send(new HeadBucketCommand({ Bucket: this.bucket })); return; }
      catch (headError) {
        if (!this.autoCreateBucket) throw headError;
        try { await this.client.send(new CreateBucketCommand({ Bucket: this.bucket })); return; }
        catch (error) { if (attempt === 14) throw error; await delay(1000); }
      }
    }
  }
  async put(key, data) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: 'image/webp', CacheControl: 'private, max-age=300' }));
  }
  async remove(key) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
  async signedUrl(key) {
    if (!key) return null;
    return getSignedUrl(this.publicClient, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: 300 });
  }
}
