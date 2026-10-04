import { z } from "zod";
import {
  categories,
  deviceStatuses,
  locationTypes,
  priorities,
  rootCauses,
  stepStatuses,
  maintenanceTypes,
} from "./domain";

export const text = z
  .string()
  .trim()
  .min(1, "Заполните обязательное поле")
  .max(200);
export const note = z
  .string()
  .trim()
  .min(5, "Введите не менее 5 символов")
  .max(5000);
const optionalId = z
  .string()
  .optional()
  .transform((v) => v || undefined);
export const incidentInput = z.object({
  title: text.min(5),
  description: note,
  priority: z.enum(
    Object.keys(priorities) as [
      keyof typeof priorities,
      ...Array<keyof typeof priorities>,
    ],
  ),
  locationId: text,
  deviceId: optionalId,
});
export const locationInput = z.object({
  code: text.max(30),
  name: text,
  type: z.enum(
    Object.keys(locationTypes) as [
      keyof typeof locationTypes,
      ...Array<keyof typeof locationTypes>,
    ],
  ),
  address: text,
  city: text,
  latitude: z.coerce.number().min(-85).max(85),
  longitude: z.coerce.number().min(-180).max(180),
  phone: z.string().trim().max(80).default(""),
});
export const deviceInput = z.object({
  assetTag: text,
  name: text,
  category: z.enum(
    Object.keys(categories) as [
      keyof typeof categories,
      ...Array<keyof typeof categories>,
    ],
  ),
  vendor: text,
  model: text,
  serialNumber: text,
  locationId: text,
  ipAddress: z.union([z.literal(""), z.ipv4()]).default(""),
  status: z.enum(
    Object.keys(deviceStatuses) as [
      keyof typeof deviceStatuses,
      ...Array<keyof typeof deviceStatuses>,
    ],
  ),
  notes: z.string().max(5000).default(""),
});
export const resolveInput = z.object({
  resolution: note,
  rootCause: z.enum(
    Object.keys(rootCauses) as [
      keyof typeof rootCauses,
      ...Array<keyof typeof rootCauses>,
    ],
  ),
});
export const visitInput = z.object({
  incidentId: text,
  engineerId: text,
  scheduledAt: z.iso.datetime({ offset: true }),
  travelNotes: z.string().max(2000).default(""),
});
export const stepInput = z.object({
  status: z.enum(
    Object.keys(stepStatuses) as [
      keyof typeof stepStatuses,
      ...Array<keyof typeof stepStatuses>,
    ],
  ),
  comment: z.string().max(2000).default(""),
  value: z.string().max(200).default(""),
});
export const maintenanceInput = z.object({
  deviceId: text,
  incidentId: optionalId,
  type: z.enum(
    Object.keys(maintenanceTypes) as [
      keyof typeof maintenanceTypes,
      ...Array<keyof typeof maintenanceTypes>,
    ],
  ),
  description: note,
  result: note,
});
