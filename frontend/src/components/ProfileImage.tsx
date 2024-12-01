import React from "react";
type Props = {
  size: string;
  src: string | undefined;
  alt: string;
};
const ProfileImage: React.FC<Props> = ({ size, src, alt }) => {
  return (
    <img
      src={src}
      alt={alt}
      style={{ borderRadius: "50%", height: size, width: size }}
    />
  );
};

export default ProfileImage;
