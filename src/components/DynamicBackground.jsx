import { useEffect, useState } from "react";

const WALLPAPERS = [
  "06191051-100c-4865-82e0-b2b046d51a0c.jpg",
  "08b89e75-c03a-41aa-9cb6-d3dd822cdfbe.jpg",
  "09b3711c-ed49-4f3f-8cc4-d1ea7d0c055a.jpg",
  "13506523084_65e07d69f4_k.jpg",
  "16783837234_d8eee7d83c_h.jpg",
  "18466b4d-517d-4389-b774-8e8d334b0816.jpg",
  "247220d9-76d0-4d75-b784-9c8fac31a4f4.jpg",
  "302b51cb-85ba-4cbb-9771-f23b9e91b095.jpg",
  "32764888973_688597f9b9_k.jpg",
  "33564724710_eb80866f69_k.jpg",
  "34378168630_2ef45b6833_k.jpg",
  "3c7c426c-4763-4452-8fd1-6d6d8beafde76.jpg",
  "3c7c426c-4763-4452-8fd1-6d6d8eafde76.jpg",
  "3d2f4b96-dbb2-4955-ba4f-96ab7b8346a5.jpg",
  "466220ac-cc82-455f-8297-d78feb4ae3bd.jpg",
  "538ba7a8-97a1-44d9-93e7-553c9f5d3ac5.jpg",
  "61ba1c1d-ed53-4360-a702-10ecd5cdb1ff.jpg",
  "65689a96-4fe9-4101-8b6c-4a00396d44c1.jpg",
  "6cb5f06a-5167-4cdf-83ff-4d2218b73942.jpg",
  "8042b6a3-5ee1-4f89-90fa-b472d4d0066e.jpg",
  "8705b956-9dc9-4577-beb2-38b6a66c7b85.jpg",
  "99961c08-17f1-4c4b-9cca-4fcb39f1b6dd.jpg",
  "a3cc15a1-fd22-4112-b020-3612dace1d00.jpg",
  "b2c7cdc7-e94f-4984-95f3-b6be9280c8c7.jpg",
  "ba77f3db-1701-49a7-bd67-4f98edd92747.jpg",
  "banner-2.jpg",
  "BB1msMpy.jpg",
  "BB1msOOX.jpg",
  "BB1msyO8.jpg",
  "bg (1).jpg",
  "BingWallpaper (1).jpg",
  "c1e0c6fc-9094-463b-b941-19430cf691e1.jpg",
  "c4738e39-76b6-4417-a43f-b11f3c87dcb6.jpg",
  "d607688d-2098-4dc0-a5f1-853b4d87dc1f.jpg",
  "daad7a1b-743b-4382-bdc4-29d829c3e83b.jpg",
  "df58305e-1df2-465b-ab4b-ec746d37d349.jpg",
  "e7cac216-08cf-4fc2-9764-e78a0a4bf3aa.jpg",
  "e7cda664-fb64-4c49-9c31-0902c05a8505.jpg",
  "e9a1c29d-7a3c-47d9-a762-824b7a86b016.jpg",
  "ef01c478-ba3b-4ee8-9d00-ee250a653e4a.jpg",
  "f2ff7f1d-163c-40c5-9ede-25a6bcef2aa4.jpg",
  "f72e1572-c291-48ac-b45c-6d8a5c1a15c0.jpg",
  "lands_of_somewhere_by_laspinter_dh07796.jpg",
  "photo-1463863711260-be04156bf894.jpeg",
  "photo-1466854076813-4aa9ac0fc347.jpg",
  "photo-1468186402854-9a641fd7a7c4.jpeg",
  "photo-1495401246624-593eb4b920ba.jpeg",
  "photo-1496304841270-2cb66cf766b4.jpeg",
  "photo-1498429089284-41f8cf3ffd39.jpeg",
  "photo-1499615767948-e6a89ef6060f.jpg",
  "photo-1516528387618-afa90b13e000.jpeg",
  "photo-1543094585-3629d00f6f3a.jpg",
  "photo-1543253539-58c7d1c00c8a.jpeg",
  "photo-1544209207-8d2b21f3c5fe.jpg",
  "photo-1544297787-43ce4f544585.jpg",
  "photo-1548242404-0c774aee869f.jpeg",
  "photo-1548345233-4557b8809829.jpeg",
  "the_wise_tree_by_donotbeatme_dhdloik.png",
];

export default function DynamicBackground() {
  const [wallpaper, setWallpaper] = useState(null);

  useEffect(() => {
    const randomImage = WALLPAPERS[Math.floor(Math.random() * WALLPAPERS.length)];
    setWallpaper(`/walpaper/${randomImage}`);
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
