import { z } from 'zod';

export const poleConditionSchema = z.enum(['GOOD', 'NEEDS_REPAIR', 'DAMAGED', 'UNKNOWN']);
export const poleTypeSchema = z.enum(['BETON', 'BESI', 'KAYU', 'LAINNYA', 'TIDAK_DIKETAHUI']);
export const validationStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED']);

function isPhotoUrlValid(value?: string | null): boolean {
  if (!value) return true;
  const v = value.trim();
  // Mendukung path lokal VPS (/uploads/poles/...), URL HTTP/HTTPS, dan Base64 offline
  if (v.startsWith('/') || v.startsWith('http://') || v.startsWith('https://')) return true;
  if (/^data:image\/(jpeg|png|webp|gif);base64,/i.test(v)) return true;
  return false;
}

export const createPoleSchema = z.object({
  id: z.string().max(5000).optional(),
  clientDraftId: z.string().max(5000).optional(),
  poleCode: z.string().max(5000).optional().default(''),
  poleLatitude: z
    .number({ required_error: 'Latitude tiang wajib ada' })
    .min(-90, 'Latitude tidak valid')
    .max(90, 'Latitude tidak valid'),
  poleLongitude: z
    .number({ required_error: 'Longitude tiang wajib ada' })
    .min(-180, 'Longitude tidak valid')
    .max(180, 'Longitude tidak valid'),
  deviceLatitude: z.number().optional().nullable(),
  deviceLongitude: z.number().optional().nullable(),
  gpsAccuracy: z.number().optional().nullable(),
  distanceFromDevice: z.number().optional().nullable(),
  locationMethod: z.string().max(5000).default('MANUAL_MAP_PIN'),
  providerId: z.string().max(5000).min(1, 'Pilih provider tiang'),
  providerName: z.string().max(5000).optional(),
  poleType: z.string().max(5000).default('BETON'),
  condition: z.string().max(5000).default('GOOD'),
  road: z.string().max(5000).optional().default(''),
  kelurahan: z.string().max(5000).min(1, 'Kelurahan wajib dipilih'),
  kecamatan: z.string().max(5000).min(1, 'Kecamatan wajib dipilih'),
  kota: z.string().max(5000).optional().default('Kota Lubuklinggau'),
  patokanLokasi: z.string().max(5000).optional().nullable().default(''),
  sisiJalan: z.string().max(5000).optional().default('TIDAK_DITENTUKAN'),
  height: z.string().max(5000).optional().default('5m'),
  ownershipStatus: z.string().max(5000).optional().default('SENDIRI'),
  cableInstallationType: z.string().max(5000).optional().default('UDARA'),
  isTilted: z.boolean().optional().default(false),
  isMessyCable: z.boolean().optional().default(false),
  isLowCable: z.boolean().optional().default(false),
  isHazardous: z.boolean().optional().default(false),
  isCorroded: z.boolean().optional().default(false),
  isObstructing: z.boolean().optional().default(false),
  description: z.string().max(5000).optional().nullable().default(''),
  photoFileId: z.string().max(5000).optional().nullable().default(''),
  photoUrl: z
    .string()
    .max(7000000)
    .refine(isPhotoUrlValid, 'URL foto tidak valid')
    .optional()
    .nullable()
    .default(''),
  additionalPhotoFileId: z.string().max(5000).optional().nullable().default(''),
  additionalPhotoUrl: z
    .string()
    .max(7000000)
    .refine(isPhotoUrlValid, 'URL foto tambahan tidak valid')
    .optional()
    .nullable()
    .default(''),
  surveyorId: z.string().max(5000).optional().default(''),
  surveyorName: z.string().max(5000).optional().default('Surveyor 1'),
  surveyDate: z.string().max(5000).optional().nullable(),
  surveyTime: z.string().max(5000).optional().nullable(),
  validationStatus: z.string().max(5000).default('SUBMITTED'),
  validationNote: z.string().max(5000).optional().nullable().default(''),
  infrastructureCategory: z.string().max(5000).optional().default('FO_WIFI'),
  pjuLampType: z.string().max(5000).optional().nullable().default(''),
  pjuLampPower: z.string().max(5000).optional().nullable().default(''),
  pjuLampCondition: z.string().max(5000).optional().nullable().default(''),
  hasKwhMeter: z.boolean().optional().nullable().default(false),
  hasNetworkCable: z.boolean().optional().nullable().default(false),
});

export const updatePoleSchema = createPoleSchema.partial().extend({
  id: z.string().max(5000).optional(),
  validationNote: z.string().max(5000).optional(),
});

export type CreatePoleFormData = z.infer<typeof createPoleSchema>;
export type UpdatePoleFormData = z.infer<typeof updatePoleSchema>;
