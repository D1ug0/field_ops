"use client";

import { useEffect, useId, useState } from "react";
import type { IncidentDeviceOption } from "@/lib/queries/devices";
import { Field } from "./common";
import { Button } from "./ui/button";

export function IncidentDeviceSelect({ locationId }: { locationId: string }) {
  const hintId = useId();
  const [options, setOptions] = useState<IncidentDeviceOption[] | null>(
    locationId ? null : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!locationId) return;
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(
          `/api/locations/${encodeURIComponent(locationId)}/device-options`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error("Device options request failed");
        const devices: IncidentDeviceOption[] = await response.json();
        if (!controller.signal.aborted) setOptions(devices);
      } catch {
        if (!controller.signal.aborted)
          setError("Не удалось загрузить оборудование. Повторите попытку.");
      }
    }

    void load();
    return () => controller.abort();
  }, [locationId, attempt]);

  const loading = options === null && !error;
  const hint = !locationId
    ? "Сначала добавьте действующий объект."
    : error
      ? error
      : loading
        ? "Загрузка оборудования выбранного объекта…"
        : options?.length
          ? `Доступно устройств: ${options.length}. Указаны инвентарный номер и IP.`
          : "На объекте нет действующего оборудования. Можно создать инцидент без устройства.";

  return (
    <div className="field">
      <Field label="Оборудование">
        <select
          name="deviceId"
          defaultValue=""
          disabled={!locationId || options === null}
          aria-busy={loading}
          aria-describedby={hintId}
        >
          <option value="">Без привязки к устройству</option>
          {options?.map((device) => (
            <option key={device.id} value={device.id}>
              {device.assetTag} · {device.name}
              {device.ipAddress ? ` · ${device.ipAddress}` : ""}
            </option>
          ))}
        </select>
        <small
          id={hintId}
          role={error ? "alert" : "status"}
          className={error ? "feedback-error" : "muted"}
        >
          {hint}
        </small>
      </Field>
      {error && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null);
            setOptions(null);
            setAttempt((value) => value + 1);
          }}
        >
          Повторить загрузку
        </Button>
      )}
    </div>
  );
}
