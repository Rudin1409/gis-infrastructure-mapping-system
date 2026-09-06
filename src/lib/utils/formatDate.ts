/**
 * Format tanggal & waktu ke standar Waktu Indonesia Barat (WIB)
 * Contoh: "25 Agu 2026, 20:02 WIB"
 */
export function formatIndonesianDate(
  dateInput?: string | Date | null,
  timeInput?: string | null,
  includeTime: boolean = true
): string {
  if (!dateInput && !timeInput) return '-';

  try {
    let dateObj: Date | null = null;

    if (dateInput) {
      const parsed = new Date(dateInput);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    }

    if (dateObj) {
      const day = String(dateObj.getDate()).padStart(2, '0');
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'Mei',
        'Jun',
        'Jul',
        'Agu',
        'Sep',
        'Okt',
        'Nov',
        'Des',
      ];
      const monthStr = months[dateObj.getMonth()];
      const year = dateObj.getFullYear();

      let timeStr = timeInput || '';
      if (!timeStr) {
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const mins = String(dateObj.getMinutes()).padStart(2, '0');
        // If hour and mins are not 00:00 (i.e. has timestamp)
        if (hours !== '00' || mins !== '00') {
          timeStr = `${hours}:${mins}`;
        }
      } else {
        timeStr = timeStr.replace('.', ':');
      }

      if (includeTime && timeStr) {
        return `${day} ${monthStr} ${year}, ${timeStr} WIB`;
      }
      return `${day} ${monthStr} ${year}`;
    }

    // Fallback if string is formatted as "YYYY-MM-DD"
    if (typeof dateInput === 'string' && dateInput.includes('-')) {
      const parts = dateInput.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}${timeInput ? `, ${timeInput.replace('.', ':')} WIB` : ''}`;
      }
    }

    return String(dateInput || '-');
  } catch (e) {
    return String(dateInput || '-');
  }
}
