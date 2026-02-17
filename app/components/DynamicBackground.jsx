"use client";

import { useEffect, useState } from "react";

export default function DynamicBackground({ images }) {
  const [wallpaper, setWallpaper] = useState(null);

  useEffect(() => {
    if (images && images.length > 0) {
      const randomImage = images[Math.floor(Math.random() * images.length)];
      setWallpaper(`/walpaper/${randomImage}`);
    }
  }, [images]);

  if (!wallpaper) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundImage: `url('${wallpaper}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        zIndex: -1,
        // Optional: Add a transition or overlay if needed
      }}
    />
  );
}
