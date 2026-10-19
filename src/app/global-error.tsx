"use client";
export default function GlobalError(_props: { error: Error & { digest?: string }; retry: () => void }) {
  return null;
}
