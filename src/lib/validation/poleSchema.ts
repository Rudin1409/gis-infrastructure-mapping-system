import { z } from 'zod';

export const poleConditionSchema = z.enum(['GOOD', 'NEEDS_REPAIR', 'DAMAGED', 'UNKNOWN']);
export const poleTypeSchema = z.enum(['BETON', 'BESI', 'KAYU', 'LAINNYA', 'TIDAK_DIKETAHUI']);
export const validationStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED']);

export const createPoleSchema = z.object({
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
  locationMethod: z.literal('MANUAL_MAP_PIN').default('MANUAL_MAP_PIN'),
  providerId: z.string().min(1, 'Pilih provider tiang'),
  providerName: z.string().optional(),
  poleType: poleTypeSchema.default('BETON'),
  condition: poleConditionSchema.default('GOOD'),
  road: z.string().min(2, 'Nama jalan wajib diisi'),
  kelurahan: z.string().min(1, 'Kelurahan wajib dipilih'),
  kecamatan: z.string().min(1, 'Kecamatan wajib dipilih'),
  description: z.string().optional().default(''),
  photoFileId: z.string().optional().default(''),
  photoUrl: z.string().optional().default(''),
  surveyorId: z.string().optional().default(''),
  surveyorName: z.string().optional().default('Surveyor Lapangan'),
  surveyDate: z.string().optional(),
  validationStatus: validationStatusSchema.default('SUBMITTED'),
});

export const updatePoleSchema = createPoleSchema.partial().extend({
  id: z.string().min(1, 'ID Tiang wajib ada'),
  validationNote: z.string().optional(),
});

export type CreatePoleFormData = z.infer<typeof createPoleSchema>;
export type UpdatePoleFormData = z.infer<typeof updatePoleSchema>;
