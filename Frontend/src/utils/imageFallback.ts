import type { SyntheticEvent } from "react";

export const showImageFallback = (event: SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = "/visual-placeholder.svg";
};

export const showAvatarFallback = (event: SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = "/avatar-placeholder.svg";
};
