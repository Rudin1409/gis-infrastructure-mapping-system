export interface Provider {
  id: string; // e.g. "PRV001"
  name: string; // e.g. "Telkom Indonesia", "Biznet"
  code: string; // e.g. "TLKM", "BIZ"
  colorHex?: string; // Theme brand color
  status: 'ACTIVE' | 'INACTIVE';
  contactPerson?: string;
  phone?: string;
  
  // Physical Pole Color Marking Metadata
  markingDescription?: string; // e.g. "Gelang Merah & Abu-abu di bagian tengah tiang"
  bodyColor?: string; // Tiang Hitam ('#1e293b') atau Galvanis Abu-abu ('#94a3b8')
  topColor?: string; // Warna gelang di pucuk tiang
  midColor?: string; // Warna gelang di tengah tiang
  botColor?: string; // Warna gelang di bagian bawah tiang
  stripCount?: number; // Jumlah strip putih (misal 2 untuk MNC, 3 untuk XL)
  textBadge?: string; // Teks khusus pada tiang (misal 'LA', 'MSA', 'ISAT')
}
