"use client";

export async function getJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? "Request failed");
  return json.data as T;
}

export async function postJson<T = unknown>(
  url: string,
  body?: unknown,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}
