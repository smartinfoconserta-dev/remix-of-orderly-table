import { supabase } from "@/integrations/supabase/client";

const DEVICE_ID_KEY = "orderly-device-id-v1";

/** Generate a unique device identifier */
const generateDeviceId = (): string => {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
};

/** Get stored device_id from localStorage */
export const getStoredDeviceId = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEVICE_ID_KEY);
};

/** Save device_id to localStorage */
const saveDeviceId = (deviceId: string) => {
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
};

/** Clear device_id from localStorage */
export const clearStoredDeviceId = () => {
  localStorage.removeItem(DEVICE_ID_KEY);
};

export type DeviceType = "tablet" | "totem" | "tv";

export interface DeviceValidationResult {
  ok: boolean;
  storeId?: string;
  mesaId?: string | null;
  label?: string;
  error?: string;
}

/** Validate device against backend */
export const validateDevice = async (deviceId: string, expectedType?: DeviceType): Promise<DeviceValidationResult> => {
  try {
    const { data, error } = await supabase
      .from("devices" as any)
      .select("id, store_id, active, type, label, mesa_id")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (error || !data) {
      return { ok: false, error: "Dispositivo não encontrado" };
    }

    if (!(data as any).active) {
      return { ok: false, error: "Dispositivo desativado pelo administrador" };
    }

    // Verify device type matches expected route
    if (expectedType && (data as any).type !== expectedType) {
      return { ok: false, error: "Dispositivo registrado como outro tipo" };
    }

    // Update last_seen_at
    await supabase
      .from("devices" as any)
      .update({ last_seen_at: new Date().toISOString() } as any)
      .eq("device_id", deviceId);

    return {
      ok: true,
      storeId: (data as any).store_id,
      mesaId: (data as any).mesa_id,
      label: (data as any).label,
    };
  } catch (err) {
    console.error("[deviceAuth] erro:", err);
    return { ok: false, error: "Erro ao validar dispositivo" };
  }
};

/** Activate a new device */
export const activateDevice = async (
  storeId: string,
  type: DeviceType,
  label?: string,
  mesaId?: string | null,
): Promise<{ ok: boolean; deviceId?: string; error?: string }> => {
  const deviceId = generateDeviceId();

  try {
    const { error } = await supabase
      .from("devices" as any)
      .insert({
        store_id: storeId,
        device_id: deviceId,
        type,
        label: label || `${type}-${Date.now()}`,
        active: true,
        mesa_id: mesaId || null,
      } as any);

    if (error) {
      console.error("[deviceAuth] activation error:", error);
      return { ok: false, error: "Erro ao registrar dispositivo" };
    }

    saveDeviceId(deviceId);
    return { ok: true, deviceId };
  } catch (err) {
    console.error("[deviceAuth] erro:", err);
    return { ok: false, error: "Erro ao ativar dispositivo" };
  }
};
