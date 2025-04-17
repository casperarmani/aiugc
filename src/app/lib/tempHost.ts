import fs from 'fs/promises';
import FormData from 'form-data';
import fetch from 'node-fetch';

export async function uploadToTempHost(localFilePath: string): Promise<string> {
  try {
    const fileBuffer = await fs.readFile(localFilePath);
    const fileName = localFilePath.split('/').pop() || 'upload';
    
    // Create a FormData instance
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);
    
    // Using file.io for temporary file hosting
    // Files are automatically deleted after 1 download or 14 days
    const response = await fetch('https://file.io', {
      method: 'POST',
      body: formData as any
    });
    
    if (!response.ok) {
      throw new Error(`Failed to upload to temp host: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Extract the public URL from the response
    const publicUrl = result.link;
    if (!publicUrl) {
      throw new Error('Could not extract public URL from temp host response');
    }
    
    console.log(`Uploaded ${localFilePath} to ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error("Error uploading to temporary host:", error);
    throw error;
  }
}