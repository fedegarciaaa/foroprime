import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convierte un texto en slug url-safe.
 * "Hola Mundo, ¡qué tal!" -> "hola-mundo-que-tal"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Formato relativo en español: "hace 3 minutos", "hace 2 días".
 */
export function formatRelativeEs(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "hace unos segundos";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `hace ${m} ${m === 1 ? "minuto" : "minutos"}`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
  }
  if (diff < 2592000) {
    const days = Math.floor(diff / 86400);
    return `hace ${days} ${days === 1 ? "día" : "días"}`;
  }
  if (diff < 31536000) {
    const months = Math.floor(diff / 2592000);
    return `hace ${months} ${months === 1 ? "mes" : "meses"}`;
  }
  const years = Math.floor(diff / 31536000);
  return `hace ${years} ${years === 1 ? "año" : "años"}`;
}

/**
 * Devuelve la IP del request usando los headers estándar de Vercel/proxies.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "0.0.0.0"
  );
}
