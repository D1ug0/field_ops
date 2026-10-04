import { Field, SelectOptions } from "./common";
import { MutationForm } from "./mutation-form";
import { categories, deviceStatuses, locationTypes } from "@/lib/domain";
import type { Device, Location } from "@/generated/prisma/client";
export function LocationForm({ location }: { location?: Location }) {
  return (
    <MutationForm
      endpoint={`/api/locations${location ? `/${location.id}` : ""}`}
      method={location ? "PATCH" : "POST"}
      navigatePrefix={location ? undefined : "/locations"}
    >
      <Field label="Код объекта">
        <input
          name="code"
          required
          defaultValue={location?.code}
          placeholder="FO-017"
          maxLength={30}
        />
      </Field>
      <Field label="Название">
        <input name="name" required defaultValue={location?.name} />
      </Field>
      <Field label="Тип">
        <select name="type" defaultValue={location?.type ?? "STORE"}>
          <SelectOptions items={locationTypes} />
        </select>
      </Field>
      <Field label="Город / район">
        <input name="city" required defaultValue={location?.city} />
      </Field>
      <Field label="Адрес">
        <input name="address" required defaultValue={location?.address} />
      </Field>
      <Field label="Телефон / контакт">
        <input name="phone" defaultValue={location?.phone} />
      </Field>
      <Field label="Широта">
        <input
          type="number"
          step="any"
          name="latitude"
          required
          min={-85}
          max={85}
          defaultValue={location?.latitude ?? 52.37}
        />
      </Field>
      <Field label="Долгота">
        <input
          type="number"
          step="any"
          name="longitude"
          required
          min={-180}
          max={180}
          defaultValue={location?.longitude ?? 4.9}
        />
      </Field>
    </MutationForm>
  );
}
export function DeviceForm({
  device,
  locations,
}: {
  device?: Device;
  locations: { id: string; name: string; code: string }[];
}) {
  return (
    <MutationForm
      endpoint={`/api/devices${device ? `/${device.id}` : ""}`}
      method={device ? "PATCH" : "POST"}
      navigatePrefix={device ? undefined : "/equipment"}
    >
      <Field label="Название">
        <input name="name" required defaultValue={device?.name} />
      </Field>
      <Field label="Инвентарный номер">
        <input name="assetTag" required defaultValue={device?.assetTag} />
      </Field>
      <Field label="Категория">
        <select name="category" defaultValue={device?.category ?? "PC"}>
          <SelectOptions items={categories} />
        </select>
      </Field>
      <Field label="Объект">
        <select name="locationId" defaultValue={device?.locationId}>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.code} · {l.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Производитель">
        <input
          name="vendor"
          required
          defaultValue={device?.vendor ?? "Generic"}
        />
      </Field>
      <Field label="Модель">
        <input name="model" required defaultValue={device?.model} />
      </Field>
      <Field label="Серийный номер">
        <input
          name="serialNumber"
          required
          defaultValue={device?.serialNumber}
        />
      </Field>
      <Field label="IP-адрес · учебный">
        <input
          name="ipAddress"
          defaultValue={device?.ipAddress}
          placeholder="10.17.20.20"
        />
      </Field>
      <Field label="Статус">
        <select name="status" defaultValue={device?.status ?? "UNKNOWN"}>
          <SelectOptions items={deviceStatuses} />
        </select>
      </Field>
      <Field label="Примечание">
        <textarea name="notes" defaultValue={device?.notes} />
      </Field>
    </MutationForm>
  );
}
