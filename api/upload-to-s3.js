export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Import AWS SDK dynamically
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    
    const { files, organizationName, token } = req.body;
    
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: 'No files provided' });
      return;
    }


    // Initialize S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    const uploadResults = {
      catalogueUrl: null,
      highlightImageUrl: null, // NEW: Add this field
      otherFiles: [],
      folderPath: `vendors/${organizationName.replace(/[^a-zA-Z0-9 ]/g, '-').replace(/\s+/g, '-')}/`
    };

    // Upload each file to S3
    for (const fileData of files) {
      try {
        
        // Determine file path in S3
        const isCatalogueFile = fileData.fieldName === 'catalogFile';
        const isHighlightImage = fileData.fieldName === 'highlightImage';
        
        
        const fileName = fileData.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        // Determine folder based on file type
        let subFolder = 'docs/'; // default
        if (isCatalogueFile) {
          subFolder = 'catalogue/';
        } else if (isHighlightImage) {
          subFolder = 'highlights/';
        }
        
        const s3Key = `${uploadResults.folderPath}${subFolder}${fileName}`;
        
        
        // Convert base64 to buffer
        const fileBuffer = Buffer.from(fileData.content, 'base64');
        
        // Upload to S3
        const command = new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: fileData.type || 'application/octet-stream'
        });
        
        await s3Client.send(command);
        
        // Create public URL
        const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
        
        // Store URL in appropriate field
        if (isCatalogueFile) {
          uploadResults.catalogueUrl = fileUrl;
        } else if (isHighlightImage) {
          uploadResults.highlightImageUrl = fileUrl; // NEW: Store highlight image URL
        } else {
          uploadResults.otherFiles.push({
            name: fileData.name,
            url: fileUrl,
            key: s3Key
          });
        }
        
      } catch (fileError) {
        console.error(`💥 Error uploading ${fileData.name}:`, fileError);
      }
    }

    const totalUploaded = (uploadResults.catalogueUrl ? 1 : 0) + 
                         (uploadResults.highlightImageUrl ? 1 : 0) + 
                         uploadResults.otherFiles.length;


    res.status(200).json({
      success: true,
      uploadResults: uploadResults,
      message: `Successfully uploaded ${totalUploaded} files`
    });

  } catch (error) {
    console.error('💥 S3 upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload files', 
      details: error.message 
    });
  }
}
