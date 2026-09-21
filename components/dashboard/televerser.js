"use client";

// Envoyer UNE image à Cloudinary, compressée si elle est trop lourde.
//
// Extrait d'ImageUploader, qui ne savait le faire qu'au sein de sa galerie.
// L'éditeur de finitions a besoin exactement de la même chose pour une seule
// pastille, et deux copies de ce code auraient divergé au premier réglage.

import imageCompression from "browser-image-compression";

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Au-delà de ce seuil, on compresse avant l'envoi : l'envoi non signé de
// Cloudinary plafonne à dix mégaoctets et refuse sans autre explication.
const SEUIL_COMPRESSION_MO = 3;

/** Cloudinary est-il configuré ? Sinon le bouton d'envoi ne sert à rien. */
export const cloudinaryPret = () => !!(CLOUD && PRESET);

/** Compresse au besoin ; rend le fichier tel quel si c'est inutile ou raté. */
export async function preparerFichier(file) {
  const estImage = file.type?.startsWith("image/");
  const tropLourde = file.size > SEUIL_COMPRESSION_MO * 1024 * 1024;
  if (!estImage || !tropLourde) return file;
  try {
    return await imageCompression(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 2500,
      useWebWorker: true,
      initialQuality: 0.82,
      fileType: file.type === "image/png" ? "image/png" : undefined,
    });
  } catch {
    return file;
  }
}

/** Envoie un fichier ou un blob et rend son adresse définitive. */
export async function televerserImage(blobOuFichier) {
  if (!cloudinaryPret()) {
    throw new Error("Cloudinary n'est pas configuré (variables d'environnement manquantes).");
  }
  const prepare = await preparerFichier(blobOuFichier);
  if (prepare.size > 10 * 1024 * 1024) {
    const mo = (prepare.size / 1024 / 1024).toFixed(1);
    throw new Error(`Image encore trop lourde après compression (${mo} Mo). Réduis-la avant.`);
  }
  const fd = new FormData();
  fd.append("file", prepare);
  fd.append("upload_preset", PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Cloudinary a refusé le fichier (${res.status})`);
  return data.secure_url;
}
