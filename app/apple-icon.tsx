import { ImageResponse } from "next/og"

// Ikona ekranu początkowego iOS: sygnet MostIn na białym tle (PNG generowany z wektora).
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <svg width="116" height="116" viewBox="0 0 44.1 44.1">
          <path fill="#e85d2a" d="M4.2,35c4,5.5,10.5,9,17.8,9s13.8-3.6,17.8-9H4.2Z" />
          <path fill="#181816" d="M22,0C9.9,0,0,9.9,0,22s.4,4.7,1.1,6.9h9.9c-1.3-2-2-4.4-2-6.9,0-5.8,3.9-10.8,9.2-12.4v8.5c0,2.1,1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8v-8.5c5.3,1.6,9.2,6.6,9.2,12.4s-.7,4.9-2,6.9h9.9c.7-2.2,1.1-4.5,1.1-6.9C44.1,9.9,34.2,0,22,0Z" />
        </svg>
      </div>
    ),
    size,
  )
}
