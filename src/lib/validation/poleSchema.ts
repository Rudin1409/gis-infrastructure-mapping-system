import { z } from 'zod';

export const poleConditionSchema = z.enum(['GOOD', 'NEEDS_REPAIR', 'DAMAGED', 'UNKNOWN']);
export const poleTypeSchema = z.enum(['BETON', 'BESI', 'KAYU', 'LAINNYA', 'TIDAK_DIKETAHUI']);
export const validationStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED']);

export const createPoleSchema = z.object({
  id: z.string().optional(),
  clientDraftId: z.string().optional(),
  poleCode: z.string().optional().default(''),
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
  locationMethod: z.string().default('MANUAL_MAP_PIN'),
  providerId: z.string().min(1, 'Pilih provider tiang'),
  providerName: z.string().optional(),
  poleType: z.string().default('BETON'),
  condition: z.string().default('GOOD'),
  road: z.string().optional().default(''),
  kelurahan: z.string().min(1, 'Kelurahan wajib dipilih'),
  kecamatan: z.string().min(1, 'Kecamatan wajib dipilih'),
  kota: z.string().optional().default('Kota Lubuklinggau'),
  patokanLokasi: z.string().optional().default(''),
  sisiJalan: z.string().optional().default('TIDAK_DITENTUKAN'),
  height: z.string().optional().default('5m'),
  ownershipStatus: z.string().optional().default('SENDIRI'),
  cableInstallationType: z.string().optional().default('UDARA'),
  isTilted: z.boolean().optional().default(false),
  isMessyCable: z.boolean().optional().default(false),
  isLowCable: z.boolean().optional().default(false),
  isHazardous: z.boolean().optional().default(false),
  isCorroded: z.boolean().optional().default(false),
  isObstructing: z.boolean().optional().default(false),
  description: z.string().optional().default(''),
  photoFileId: z.string().optional().default(''),
  photoUrl: z.string().optional().default(''),
  surveyorId: z.string().optional().default(''),
  surveyorName: z.string().optional().default('Surveyor 1'),
  surveyDate: z.string().optional(),
  surveyTime: z.string().optional(),
  validationStatus: z.string().default('SUBMITTED'),
  validationNote: z.string().optional().default(''),
  infrastructureCategory: z.string().optional().default('FO_WIFI'),
  pjuLampType: z.string().optional().default(''),
  pjuLampPower: z.string().optional().default(''),
  pjuLampCondition: z.string().optional().default(''),
  hasKwhMeter: z.boolean().optional().default(false),
  hasNetworkCable: z.boolean().optional().default(false),
});

export const updatePoleSchema = createPoleSchema.partial().extend({
  id: z.string().optional(),
  validationNote: z.string().optional(),
});

export type CreatePoleFormData = z.infer<typeof createPoleSchema>;
export type UpdatePoleFormData = z.infer<typeof updatePoleSchema>;
