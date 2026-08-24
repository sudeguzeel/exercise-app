import { supabase } from "@/shared/lib/supabase";
import { decode } from "base64-arraybuffer";

export type PhotoTransform = { x: number; y: number; scale: number };

export type AvatarData = {
  url: string | null;
  transform: PhotoTransform | null;
};

const AVATAR_BUCKET = "avatars";

export async function loadAvatar(): Promise<AvatarData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url: null, transform: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_url, avatar_transform")
    .eq("user_id", user.id)
    .maybeSingle<{ avatar_url: string | null; avatar_transform: PhotoTransform | null }>();

  if (error || !data) return { url: null, transform: null };
  return { url: data.avatar_url, transform: data.avatar_transform };
}

export async function saveAvatar(dataUri: string, transform: PhotoTransform): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum bilgisi bulunamadı.");

  const match = /^data:(.+);base64,(.+)$/.exec(dataUri);
  const contentType = match?.[1] ?? "image/jpeg";
  const base64 = match?.[2] ?? dataUri;
  const extension = contentType === "image/png" ? "png" : "jpg";
  const path = `${user.id}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, decode(base64), { contentType, upsert: true });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const url = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: url, avatar_transform: transform })
    .eq("user_id", user.id);
  if (updateError) throw updateError;

  return url;
}

export async function removeAvatar(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum bilgisi bulunamadı.");

  await supabase.storage
    .from(AVATAR_BUCKET)
    .remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`]);

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, avatar_transform: null })
    .eq("user_id", user.id);
  if (error) throw error;
}
