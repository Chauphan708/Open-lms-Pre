import { createClient } from '@supabase/supabase-js';

// Get Env Variables for the External Storage Supabase
// This isolates huge files (images/pdfs) from the primary LMS database over time.

const getEnv = (key: string) => {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
        // @ts-ignore
        return import.meta.env[key];
    }
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        // @ts-ignore
        return process.env[key];
    }
    return '';
};

// Config for the "Secondary" Supabase intended ONLY for Storage Operations
// Giáo viên cần tạo dự án Supabase phụ và điền URL/KEY này vào file .env
const externalStorageUrl = getEnv('VITE_STORAGE_SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || 'https://placeholder.supabase.co';
const externalStorageKey = getEnv('VITE_STORAGE_SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || 'placeholder';

export const externalSupabase = createClient(externalStorageUrl, externalStorageKey);

/**
 * Uploads a file to the external Supabase bucket (default: 'ai_submissions')
 */
export const uploadToExternalStorage = async (
    file: File | Blob,
    fileName: string,
    bucketName: string = 'ai_submissions'
): Promise<string | null> => {
    try {
        const { data, error } = await externalSupabase
            .storage
            .from(bucketName)
            .upload(fileName, file, { upsert: true });

        if (error) {
            console.error("External Storage Upload Error:", error);
            return null;
        }

        // Return public URL after successful upload
        const { data: publicUrlData } = externalSupabase
            .storage
            .from(bucketName)
            .getPublicUrl(data.path);

        return publicUrlData.publicUrl;
    } catch (e) {
        console.error("Failed to upload to external storage", e);
        return null;
    }
}

/**
 * Deletes a file from the external Supabase bucket to free up space.
 */
export const deleteFromExternalStorage = async (
    fileNameOrPath: string,
    bucketName: string = 'ai_submissions'
): Promise<boolean> => {
    try {
        // Extract filepath if a full URL is provided
        let pathToDelete = fileNameOrPath;
        if (fileNameOrPath.includes(bucketName + '/')) {
            pathToDelete = fileNameOrPath.split(bucketName + '/')[1];
        }

        const { error } = await externalSupabase
            .storage
            .from(bucketName)
            .remove([pathToDelete]);

        if (error) {
            console.error("External Storage Delete Error:", error);
            return false;
        }
        return true;
    } catch (e) {
        console.error("Failed to delete from external storage", e);
        return false;
    }
}
