export const showImageFallback = (event) => {
    const image = event.currentTarget;
    image.onerror = null;
    image.src = "/visual-placeholder.svg";
};
export const showAvatarFallback = (event) => {
    const image = event.currentTarget;
    image.onerror = null;
    image.src = "/avatar-placeholder.svg";
};
