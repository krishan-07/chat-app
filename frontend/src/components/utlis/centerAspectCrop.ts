import { centerCrop, makeAspectCrop } from "react-image-crop";

export default function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number = 1
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}
