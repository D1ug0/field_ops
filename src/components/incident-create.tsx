"use client";
import { useState } from "react";
import { MutationForm } from "./mutation-form";
import { Field, SelectOptions } from "./common";
import { priorities } from "@/lib/domain";
import { IncidentDeviceSelect } from "./incident-device-select";
export function IncidentCreate({
  locations,
}: {
  locations: { id: string; name: string; code: string }[];
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
          required
          value={locationId}
          onChange={(e) => setLocation(e.target.value)}
        >
          {!locations.length && (
            <option value="">Нет доступных объектов</option>
          )}
          {locations.map((l) => (
            <option value={l.id} key={l.id}>
              {l.code} · {l.name}
            </option>
          ))}
        </select>
      </Field>
      <IncidentDeviceSelect key={locationId} locationId={locationId} />
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
