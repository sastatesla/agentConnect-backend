const express = require('express');
const router = express.Router();
const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize Google Cloud Storage
const storage = new Storage();

// Use the default App Engine bucket or a specified env var
// Standard pattern: <project-id>.appspot.com or <project-id>.appspot.com
const bucketName = process.env.GCS_BUCKET_NAME || `${process.env.GOOGLE_CLOUD_PROJECT || 'project-bc4324f8-fd54-4382-9d8'}.appspot.com`;
const bucket = storage.bucket(bucketName);

// @desc    Get Signed URL for uploading (Write)
// @route   GET /api/upload/write-url
router.get('/write-url', async (req, res) => {
    try {
        const { filename, contentType, folder = 'uploads' } = req.query;

        if (!filename || !contentType) {
            return res.status(400).json({ message: 'Filename and Content-Type are required' });
        }

        // Create a unique filename
        const extension = path.extname(filename);
        // Simple sanitization to keep it within expected folders (posts, chats, uploads)
        const safeFolder = folder.replace(/[^a-z0-9]/gi, '_');
        const uniqueFilename = `${safeFolder}/${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`;
        const file = bucket.file(uniqueFilename);

        console.log(`[GCS] Generating Signed URL for: ${uniqueFilename} in bucket: ${bucketName}`);

        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType: contentType,
        });

        console.log(`[GCS] Generated URL successfully.`);

        res.json({
            uploadUrl: url,
            fileKey: uniqueFilename,
            bucketName: bucketName,
            publicUrl: `https://storage.googleapis.com/${bucketName}/${uniqueFilename}`
        });

    } catch (error) {
        console.error('GCS Sign Error:', error);
        console.error('GCS Bucket Name used:', bucketName);
        console.error('Verify that GCS_BUCKET_NAME is set in .env or the default project ID is correct.');
        res.status(500).json({ message: 'Could not generate signed URL', error: error.message });
    }
});

// @desc    Get Signed URL for reading (Read)
// @route   GET /api/upload/read-url
router.get('/read-url', async (req, res) => {
    try {
        const { fileKey } = req.query;

        if (!fileKey) {
            return res.status(400).json({ message: 'File key is required' });
        }

        const file = bucket.file(fileKey);

        // Generate signed URL
        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000, // 1 hour
        });

        res.json({ readUrl: url });

    } catch (error) {
        console.error('GCS Read Sign Error:', error);
        res.status(500).json({ message: 'Could not generate read URL' });
    }
});

module.exports = router;
