
import { Guest } from '../types';
import { GOOGLE_SHEETS_SCRIPT_URL } from '../constants';

export const googleSheetsService = {
  async syncToSheets(guests: Guest[]): Promise<{ success: boolean; message: string }> {
    if (!GOOGLE_SHEETS_SCRIPT_URL || GOOGLE_SHEETS_SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
      return { 
        success: false, 
        message: 'URL Google Sheets belum dikonfigurasi. Silakan atur di constants.tsx' 
      };
    }

    try {
      const response = await fetch(GOOGLE_SHEETS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Apps Script membutuhkan no-cors untuk simple POST
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(guests),
      });

      // Karena mode no-cors, kita tidak bisa membaca isi response body secara detail,
      // tapi jika tidak ada error throw, kita asumsikan berhasil terkirim.
      return { 
        success: true, 
        message: 'Data berhasil dikirim ke antrean sinkronisasi Google Sheets.' 
      };
    } catch (error) {
      console.error('Google Sheets Sync Error:', error);
      return { 
        success: false, 
        message: 'Gagal menghubungi Google Sheets. Periksa koneksi atau URL script.' 
      };
    }
  }
};
