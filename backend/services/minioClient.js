const Minio = require('minio');

const client = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true' || false,
  accessKey: process.env.MINIO_ROOT_USER || 'minio',
  secretKey: process.env.MINIO_ROOT_PASSWORD || 'minio123'
});

const BUCKET = process.env.MINIO_BUCKET || 'buildbrain';

async function ensureBucket() {
  try {
    const exists = await client.bucketExists(BUCKET);
    if (!exists) await client.makeBucket(BUCKET);
  } catch (err) {
    // ignore
  }
}

async function uploadFile(localPath, objectName) {
  await ensureBucket();
  return new Promise((resolve, reject) => {
    client.fPutObject(BUCKET, objectName, localPath, {}, (err, etag) => {
      if (err) return reject(err);
      resolve(etag);
    });
  });
}

module.exports = { uploadFile };
