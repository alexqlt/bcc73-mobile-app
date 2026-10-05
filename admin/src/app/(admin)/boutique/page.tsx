import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Badge, Button, Card, EmptyState, formatDate, Input, Label, PageHeader } from "@/components/ui";
import { requireAnyPermission, SHOP_PERMISSIONS } from "@/lib/auth";
import { eurosInputValue, formatEuros } from "@/lib/shop";
import { createClient } from "@/lib/supabase/server";

import { createProduct, deleteProduct, setPickedUp, updateProduct } from "./actions";

export const metadata = { title: "Boutique — BCC73 Administration" };

const salesFilters = [
  { value: "a-remettre", label: "À remettre" },
  { value: "toutes", label: "Toutes les ventes" },
];

/** P6-05 et P6-08 : articles de la boutique et ventes payées (à remettre au club). */
export default async function BoutiquePage({ searchParams }: PageProps<"/boutique">) {
  const viewer = await requireAnyPermission(SHOP_PERMISSIONS);
  const canManage = viewer.permissions.has("VOLANT_MANAGE");
  const filter = (await searchParams).ventes === "toutes" ? "toutes" : "a-remettre";
  const supabase = await createClient();

  let salesQuery = supabase
    .from("orders")
    .select("id, payer_name, payer_email, total_cents, paid_at, picked_up_at, order_items (label, quantity)")
    .eq("type", "shop")
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(200);
  if (filter === "a-remettre") salesQuery = salesQuery.is("picked_up_at", null);

  const [products, sales] = await Promise.all([
    supabase.from("products").select("*").order("active", { ascending: false }).order("name"),
    salesQuery,
  ]);
  if (products.error) throw products.error;
  if (sales.error) throw sales.error;

  const total = sales.data.reduce((sum, order) => sum + order.total_cents, 0);

  return (
    <>
      <PageHeader eyebrow="Club" title="Boutique" />

      <section className="mb-10">
        <h2 className="mb-3 text-xl">Articles</h2>
        {canManage && (
          <Card className="mb-4">
            <ProductForm action={createProduct} submitLabel="Ajouter l'article" />
          </Card>
        )}
        {products.data.length === 0 ? (
          <EmptyState>Aucun article : ajoutez par exemple « Tube de volants ».</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {products.data.map((product) => (
              <li key={product.id} className={`flex flex-col gap-3 bg-surface p-4 ${product.active ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold">{product.name}</span>
                  <span className="font-heading">{formatEuros(product.price_cents)}</span>
                  {!product.active && <Badge>Masqué dans l&apos;app</Badge>}
                  {product.description && <span className="text-sm text-muted">{product.description}</span>}
                </div>
                {canManage && (
                  <details>
                    <summary className="cursor-pointer text-sm underline decoration-accent decoration-2 underline-offset-4">
                      Modifier
                    </summary>
                    <div className="mt-3 flex flex-col gap-3">
                      <ProductForm action={updateProduct} product={product} submitLabel="Enregistrer" />
                      <ActionForm action={deleteProduct}>
                        <input type="hidden" name="productId" value={product.id} />
                        <ConfirmButton variant="danger" message="Supprimer cet article ? Les ventes passées restent enregistrées.">
                          Supprimer l&apos;article
                        </ConfirmButton>
                      </ActionForm>
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-xl">Ventes</h2>
          <nav className="flex flex-wrap gap-1">
            {salesFilters.map((item) => (
              <Link
                key={item.value}
                href={item.value === "toutes" ? "/boutique?ventes=toutes" : "/boutique"}
                className={`border-2 px-3 py-1 font-heading text-xs uppercase tracking-wider ${
                  item.value === filter ? "border-foreground bg-foreground text-background" : "border-border"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {sales.data.length > 0 && (
            <span className="ml-auto text-sm text-muted">
              {sales.data.length} vente(s) · {formatEuros(total)}
            </span>
          )}
        </div>
        {sales.data.length === 0 ? (
          <EmptyState>{filter === "a-remettre" ? "Rien à remettre pour le moment." : "Aucune vente payée."}</EmptyState>
        ) : (
          <ul className="flex flex-col divide-y divide-border bg-surface">
            {sales.data.map((order) => (
              <li key={order.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:gap-4">
                <div className="flex-1">
                  <p>
                    <strong>{order.payer_name ?? "Adhérent"}</strong>{" "}
                    <span className="text-sm text-muted">{order.payer_email}</span>
                  </p>
                  <p className="text-sm">
                    {order.order_items.map((item) => `${item.quantity} × ${item.label}`).join(", ")} ·{" "}
                    <span className="font-heading">{formatEuros(order.total_cents)}</span>
                  </p>
                  <p className="text-xs text-muted">
                    Payé le {formatDate(order.paid_at)}
                    {order.picked_up_at && ` · remis le ${formatDate(order.picked_up_at)}`}
                  </p>
                </div>
                <ActionForm action={setPickedUp}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="pickedUp" value={String(!order.picked_up_at)} />
                  <Button type="submit" variant={order.picked_up_at ? "secondary" : "accent"}>
                    {order.picked_up_at ? "Annuler la remise" : "Marquer comme remis"}
                  </Button>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function ProductForm({
  action,
  product,
  submitLabel,
}: {
  action: Parameters<typeof ActionForm>[0]["action"];
  product?: { id: string; name: string; description: string | null; price_cents: number; active: boolean };
  submitLabel: string;
}) {
  const id = product?.id ?? "new";
  return (
    <ActionForm action={action} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {product && <input type="hidden" name="productId" value={product.id} />}
      <div className="flex flex-col gap-1">
        <Label htmlFor={`name-${id}`}>Article</Label>
        <Input id={`name-${id}`} name="name" defaultValue={product?.name} placeholder="Ex. Tube de volants" maxLength={100} required />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`price-${id}`}>Prix (€)</Label>
        <Input
          id={`price-${id}`}
          name="price"
          inputMode="decimal"
          defaultValue={product ? eurosInputValue(product.price_cents) : undefined}
          placeholder="25,00"
          required
        />
      </div>
      <div className="flex flex-col gap-1 lg:col-span-2">
        <Label htmlFor={`description-${id}`}>Description</Label>
        <Input
          id={`description-${id}`}
          name="description"
          defaultValue={product?.description ?? undefined}
          placeholder="Ex. Yonex Mavis 350, tube de 6"
          maxLength={1000}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="accent-[var(--accent)]" />
        Visible dans l&apos;app
      </label>
      <div className="sm:col-span-2 lg:col-span-5">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </ActionForm>
  );
}
