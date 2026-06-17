"use client";

import { useEffect, useRef, useState } from "react";
import { getJson, postJson } from "@/lib/client-api";
import { shortenAddress } from "@/lib/format";

type Profile = {
  wallet: string;
  displayName: string | null;
  avatarUrl: string | null;
  persisted: boolean;
};

const MAX_AVATAR_BYTES = 280_000; // keep data URL comfortably under the 300k cap

function storageKey(wallet: string) {
  return `blobbie:profile:${wallet.toLowerCase()}`;
}

/** Resize/crop an image File to a square data URL (default 128px). */
function fileToAvatar(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unsupported"));
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfileCard({ wallet }: { wallet: string }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // localStorage cache (works without a database).
      let cachedName = "";
      let cachedAvatar: string | null = null;
      try {
        const raw = localStorage.getItem(storageKey(wallet));
        if (raw) {
          const p = JSON.parse(raw);
          cachedName = p.displayName ?? "";
          cachedAvatar = p.avatarUrl ?? null;
        }
      } catch {
        /* ignore */
      }
      try {
        const { profile } = await getJson<{ profile: Profile }>("/api/profile");
        if (cancelled) return;
        if (profile.persisted) {
          setName(profile.displayName ?? "");
          setAvatar(profile.avatarUrl ?? null);
        } else {
          setName(cachedName);
          setAvatar(cachedAvatar);
        }
      } catch {
        if (!cancelled) {
          setName(cachedName);
          setAvatar(cachedAvatar);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    if (!file.type.startsWith("image/")) {
      setErr("Please choose an image file.");
      return;
    }
    try {
      const dataUrl = await fileToAvatar(file);
      if (dataUrl.length > MAX_AVATAR_BYTES) {
        setErr("Image is too large after processing. Try a smaller image.");
        return;
      }
      setAvatar(dataUrl);
    } catch {
      setErr("Could not process that image.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    setErr(null);
    const payload = { displayName: name.trim(), avatarUrl: avatar ?? "" };
    try {
      localStorage.setItem(
        storageKey(wallet),
        JSON.stringify({ displayName: payload.displayName, avatarUrl: avatar }),
      );
    } catch {
      /* ignore quota */
    }
    const res = await postJson<{ profile: Profile }>("/api/profile", payload);
    setSaving(false);
    if (!res.ok) {
      setErr(res.error ?? "Could not save profile.");
      return;
    }
    setMsg(
      res.data?.profile.persisted
        ? "Profile saved."
        : "Saved locally (connect a database to sync across devices).",
    );
    window.dispatchEvent(new CustomEvent("blobbie:profile-updated"));
  }

  const preview = avatar || "/logo.svg";

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display not-italic">Your Profile</h3>
        <span className="text-xs not-italic text-cream-dim">
          {shortenAddress(wallet, 5)}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-ink bg-paper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Avatar" className="h-full w-full object-cover" />
          </span>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="btn-ghost px-4 py-2"
              onClick={() => fileRef.current?.click()}
              disabled={!loaded}
            >
              Upload avatar
            </button>
            {avatar && (
              <button
                type="button"
                className="text-xs not-italic text-rose-300 hover:underline"
                onClick={() => setAvatar(null)}
              >
                Remove avatar
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />
          </div>
        </div>

        <div className="flex-1">
          <label className="block">
            <span className="stat-label">Display name</span>
            <input
              className="input mt-1"
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BlobMaster"
            />
          </label>
          <div className="mt-3 flex items-center gap-3">
            <button className="btn-accent" onClick={save} disabled={saving || !loaded}>
              {saving ? "Saving…" : "Save profile"}
            </button>
            {msg && <span className="text-xs not-italic text-accent-green">{msg}</span>}
            {err && <span className="text-xs not-italic text-rose-300">{err}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
