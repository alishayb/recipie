export const isValidFileType = (file: File) =>
  file.type === "application/pdf" || file.type.includes("image");
