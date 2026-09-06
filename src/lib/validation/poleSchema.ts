import { z } from 'zod';

export const poleConditionSchema = z.enum(['GOOD', 'NEEDS_REPAIR', 'DAMAGED', 'UNKNOWN']);
export const poleTypeSchema = z.enum(['BETON', 'BESI', 'KAYU', 'LAINNYA', 'TIDAK_DIKETAHUI']);
export const validationStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED']);

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
  deviceLatitude: z.number().optional(),
  deviceLongitude: z.number().optional(),
  gpsAccuracy: z.number().optional(),
  distanceFromDevice: z.number().optional(),
  locationMethod: z.string().max(5000).default('MANUAL_MAP_PIN'),
  providerId: z.string().max(5000).min(1, 'Pilih provider tiang'),
  providerName: z.string().max(5000).optional(),
  poleType: z.string().max(5000).default('BETON'),
  condition: z.string().max(5000).default('GOOD'),
  road: z.string().max(5000).optional().default(''),
  kelurahan: z.string().max(5000).min(1, 'Kelurahan wajib dipilih'),
  kecamatan: z.string().max(5000).min(1, 'Kecamatan wajib dipilih'),
  kota: z.string().max(5000).optional().default('Kota Lubuklinggau'),
  patokanLokasi: z.string().max(5000).optional().default(''),
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
  description: z.string().max(5000).optional().default(''),
  photoFileId: z.string().max(5000).optional().default(''),
  photoUrl: z
    .string()
    .max(7000000)
    .refine(
      (value) =>
        !value ||
        /^https:\/\//i.test(value) ||
        /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value),
      'URL foto tidak valid'
    )
    .optional()
    .default(''),
  surveyorId: z.string().max(5000).optional().default(''),
  surveyorName: z.string().max(5000).optional().default('Surveyor 1'),
  surveyDate: z.string().max(5000).optional(),
  surveyTime: z.string().max(5000).optional(),
  validationStatus: z.string().max(5000).default('SUBMITTED'),
  validationNote: z.string().max(5000).optional().default(''),
  infrastructureCategory: z.string().max(5000).optional().default('FO_WIFI'),
  pjuLampType: z.string().max(5000).optional().default(''),
  pjuLampPower: z.string().max(5000).optional().default(''),
  pjuLampCondition: z.string().max(5000).optional().default(''),
  hasKwhMeter: z.boolean().optional().default(false),
  hasNetworkCable: z.boolean().optional().default(false),
});

export const updatePoleSchema = createPoleSchema.partial().extend({
  id: z.string().max(5000).optional(),
  validationNote: z.string().max(5000).optional(),
});

export type CreatePoleFormData = z.infer<typeof createPoleSchema>;
export type UpdatePoleFormData = z.infer<typeof updatePoleSchema>;
