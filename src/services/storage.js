/**
 * ============================================================================
 * STORAGE SERVICE — SUPABASE STORAGE BUCKETS & ASSETS
 * APDAGU Enterprise v2.0
 * ============================================================================
 */

import { getSupabase } from './supabase.js';
import { CONFIG } from '../app/config.js';

class StorageService {
  /**
   * Mengunggah file ke bucket tertentu
   * @param {string} bucket - 'foto-guru' | 'dokumen' | 'ijazah' | 'sertifikat' | 'ttd' | 'logo'
   * @param {File|Blob} file - File objek
   * @param {string} customFilename - Nama file opsional
   * @returns {Promise<{path: string, url: string}>}
   */
  async uploadFile(bucket, file, customFilename = null) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Supabase client tidak tersedia.');

    // Validasi ukuran
    const maxSize = bucket === 'ttd' ? 2 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`Ukuran file melebihi batas (${(maxSize / (1024 * 1024)).toFixed(0)}MB).`);
    }

    // Generate path aman
    const ext = file.name ? file.name.split('.').pop().toLowerCase() : 'jpg';
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = customFilename ? `${customFilename}.${ext}` : `${timestamp}_${randomStr}.${ext}`;
    const filePath = `${fileName}`;

    // Upload
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const publicUrl = this.getPublicUrl(bucket, data.path);
    return {
      path: data.path,
      url: publicUrl,
      bucket
    };
  }

  /**
   * Mendapatkan Public URL dari path
   */
  getPublicUrl(bucket, path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path; // Already full URL or data URI
    }
    const bucketName = bucket || CONFIG.STORAGE_BUCKETS.FOTO_GURU;
    return `${CONFIG.SUPABASE.URL}/storage/v1/object/public/${bucketName}/${path}`;
  }

  /**
   * Menghapus file dari bucket
   */
  async deleteFile(bucket, path) {
    const supabase = await getSupabase();
    if (!supabase || !path) return;
    const cleanPath = path.replace(`${CONFIG.SUPABASE.URL}/storage/v1/object/public/${bucket}/`, '');
    await supabase.storage.from(bucket).remove([cleanPath]);
  }

  /**
   * Kompresi gambar client-side sebelum upload
   */
  async compressImage(file, maxWidth = 1000, quality = 0.82) {
    if (!file.type.startsWith('image/')) return file;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              const compressed = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
              resolve(compressed);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', quality);
        };
      };
    });
  }
}

export const Storage = new StorageService();
