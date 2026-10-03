import { ImageResponse } from "next/og"

// Ikona ekranu początkowego iOS: sygnet MostIn na białym tle (PNG generowany z wektora).
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <svg width="110" height="110" viewBox="0 0 49.46 49.76" fill="#e85d2a">
          <path d="M22.02,5.63v14.33c0,1.5,1.21,2.71,2.71,2.71h0c1.5,0,2.71-1.21,2.71-2.71V5.63c8.57,1.2,15.36,7.96,16.550,16.54h5.47C48.11,9.7,37.56,0,24.73,0S1.350,9.7,0,22.17h5.47c1.2-8.57,7.98-15.34,16.550-16.54Z" />
          <path d="M24.73,44.34c-9.83,0-17.95-7.28-19.27-16.75H0c1.35,12.47,11.91,22.17,24.73,22.17s23.38-9.7,24.73-22.17h-5.47c-1.32,9.46-9.44,16.75-19.27,16.75Z" />
        </svg>
      </div>
    ),
    size,
  )
}
