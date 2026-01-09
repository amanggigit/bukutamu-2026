
import { GoogleGenAI, Type } from "@google/genai";
import { Guest } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async getVisitSummary(guests: Guest[]): Promise<string> {
    if (guests.length === 0) return "Tidak ada data kunjungan untuk dirangkum.";
    
    const guestDataString = guests.slice(0, 10).map(g => 
      `- ${g.name} (${g.category}) ke ${g.room} bertemu ${g.official}: ${g.purpose}`
    ).join('\n');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analisis data kunjungan tamu di Sekretariat Daerah Kabupaten Tapin berikut dan berikan ringkasan dalam 3 kalimat saja tentang tren kunjungan terbaru:
        
        ${guestDataString}`,
      });
      return response.text || "Gagal mendapatkan ringkasan AI.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Terjadi kesalahan saat memproses ringkasan dengan AI.";
    }
  },

  async refinePurpose(purpose: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Tingkatkan kalimat "Perihal Kunjungan" berikut agar lebih formal dan profesional untuk keperluan birokrasi pemerintahan (hanya berikan kalimat hasil perbaikannya saja): "${purpose}"`,
      });
      return response.text || purpose;
    } catch (error) {
      return purpose;
    }
  }
};
