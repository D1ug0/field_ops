"use client";
import { useState } from "react";
import { MutationForm } from "./mutation-form";
import { Field, SelectOptions } from "./common";
import { priorities } from "@/lib/domain";
export function IncidentCreate({
  locations,
  devices,
}: {
  locations: { id: string; name: string; code: string }[];
  devices: { id: string; name: string; locationId: string }[];
}) {
  const [locationId, setLocation] = useState(locations[0]?.id ?? "");
  return (
    <MutationForm
      endpoint="/api/incidents"
      label="Зарегистрировать инцидент"
      navigatePrefix="/incidents"
    >
      <Field label="Краткое описание">
        <input
          name="title"
          minLength={5}
          maxLength={200}
          required
          placeholder="Например, весы не получают обновления PLU"
        />
      </Field>
      <Field label="Приоритет">
        <select name="priority" defaultValue="P3_MEDIUM">
          <SelectOptions items={priorities} />
        </select>
      </Field>
      <Field label="Объект">
        <select
          name="locationId"
          value={locationId}
          onChange={(e) => setLocation(e.target.value)}
        >
          {locations.map((l) => (
            <option value={l.id} key={l.id}>
              {l.code} · {l.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Оборудование">
        <select name="deviceId" key={locationId}>
          <option value="">Без привязки к устройству</option>
          {devices
            .filter((d) => d.locationId === locationId)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Симптомы и обстоятельства">
        <textarea
          name="description"
          rows={3}
          minLength={5}
          maxLength={5000}
          required
          placeholder="Что произошло, когда, какое влияние на работу объекта?"
        />
      </Field>
    </MutationForm>
  );
}
