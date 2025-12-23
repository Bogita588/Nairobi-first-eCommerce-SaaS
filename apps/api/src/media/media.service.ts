import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MediaService {
  private s3: S3Client | null = null;
  private bucket: string | null = null;

  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>('AWS_REGION');
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    if (region && bucket) {
      this.bucket = bucket;
      this.s3 = new S3Client({
        region,
        credentials: this.config.get<string>('AWS_ACCESS_KEY_ID')
          ? {
              accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID') as string,
              secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY') as string
            }
          : undefined
      });
    }
  }

  async signUpload(filename: string, contentType: string, tenantId: string) {
    if (!this.s3 || !this.bucket) {
      // Fallback stub if S3 not configured
      return {
        uploadUrl: `https://uploads.example.com/${encodeURIComponent(filename)}`,
        contentType,
        fields: {},
        provider: 'stub'
      };
    }
    const key = `${tenantId}/${Date.now()}-${filename}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType
    });
    try {
      const url = await getSignedUrl(this.s3, command, { expiresIn: 300 });
      return {
        uploadUrl: url,
        contentType,
        key,
        provider: 's3'
      };
    } catch (err) {
      throw new InternalServerErrorException('Failed to sign upload URL');
    }
  }
}
