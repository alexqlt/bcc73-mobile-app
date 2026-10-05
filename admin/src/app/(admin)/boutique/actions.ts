"use server";

import { refresh } from "next/cache";

import { toActionState, type ActionState } from "@/lib/action-state";
import { parseEuros } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";

// VOLANT_MANAGE (produits) et VOLANT_VIEW_SALES (remise des commandes) sont vérifiés par la RLS.

const noRightError = { error: "Vous n'avez pas le droit d'effectuer cette action." };

function readProduct(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const price = parseEuros(formData.get("price"));
  if (!name) return { error: "Donnez un nom à l'article." };
  if (!price) return { error: "Indiquez un prix valide (ex. 25 ou 25,50)." };
  return {
    values: {
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      price_cents: price,
      active: formData.get("active") === "on",
    },
  };
}

export async function createProduct(_state: ActionState, formData: FormData): Promise<ActionState> {
  const product = readProduct(formData);
  if ("error" in product) return product;
  const supabase = await createClient();
  const { error } = await supabase.from("products").insert(product.values);
  if (error) return toActionState(error);
  refresh();
  return null;
}

export async function updateProduct(_state: ActionState, formData: FormData): Promise<ActionState> {
  const product = readProduct(formData);
  if ("error" in product) return product;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update(product.values)
    .eq("id", String(formData.get("productId")))
    .select("id");
  if (error) return toActionState(error);
  if (data.length === 0) return noRightError;
  refresh();
  return null;
}

export async function deleteProduct(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").delete().eq("id", String(formData.get("productId"))).select("id");
  if (error) return toActionState(error);
  if (data.length === 0) return noRightError;
  refresh();
  return null;
}

/** P6-08 : articles remis à l'adhérent (ou annulation de la remise). */
export async function setPickedUp(_state: ActionState, formData: FormData): Promise<ActionState> {
  const pickedUp = formData.get("pickedUp") === "true";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ picked_up_at: pickedUp ? new Date().toISOString() : null })
    .eq("id", String(formData.get("orderId")))
    .select("id");
  if (error) return toActionState(error);
  if (data.length === 0) return noRightError;
  refresh();
  return null;
}

/** Annule une commande du mode développeur (administrateurs, vérifié par la base). */
export async function cancelTestOrder(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_cancel_test_order", { order_id: String(formData.get("orderId")) });
  if (error) return toActionState(error);
  refresh();
  return null;
}

