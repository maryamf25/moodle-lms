import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: process.env.AWS_REGION as string,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
});

export async function uploadToS3(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folderName: string
): Promise<string> {
    // Clean filename and make it unique
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${folderName}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${safeName}`;

    const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: uniqueFileName,
        Body: fileBuffer,
        ContentType: mimeType,
    });

    await s3Client.send(command);

    // Return the public S3 URL of the uploaded file
    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;
}
