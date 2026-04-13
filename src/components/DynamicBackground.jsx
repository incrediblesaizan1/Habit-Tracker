import { useEffect, useState } from "react";

export default function DynamicBackground() {
  const [wallpaper, setWallpaper] = useState(null);

  useEffect(() => {
    // Fetch wallpaper list from server
    fetch("/api/wallpapers")
      .then((res) => res.json())
      .then((images) => {
        if (images && images.length > 0) {
          const randomImage = images[Math.floor(Math.random() * images.length)];
          setWallpaper(`/walpaper/${randomImage}`);
        }
      })
      .catch(() => {
        // Silent fail — no wallpaper
      });
  }, []);

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
        opacity: 0.6,
      }}
    />
  );
}
