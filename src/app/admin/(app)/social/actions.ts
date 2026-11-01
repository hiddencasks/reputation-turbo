"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { getSocialPost, networks, type Network } from "@/lib/social";
import { checkConnection, publishNow } from "@/lib/social-publish";

export async function postNow(formData: FormData) {
  await requireOwner();
  const post = getSocialPost(String(formData.get("postId") ?? ""));
  const network = String(formData.get("network") ?? "") as Network;
  if (!post || !networks.includes(network)) return;
  const outcome = await publishNow(post, network);
  revalidatePath("/admin/social");
  const msg = !outcome ? "Already posted." : outcome.status === "posted" ? "Posted." : `Didn't post: ${outcome.error}`;
  redirect(`/admin/social?msg=${encodeURIComponent(msg)}#${post.id}`);
}

export async function testConnection() {
  await requireOwner();
  const results = await checkConnection();
  const msg = results.map((r) => `${r.network === "facebook" ? "Facebook" : "Instagram"}: ${r.ok ? "✓ " : "✕ "}${r.detail}`).join("  ·  ");
  redirect(`/admin/social?msg=${encodeURIComponent(msg)}`);
}
