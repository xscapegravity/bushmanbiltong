import Link from "next/link";
import { getDb } from "@/lib/db";
import { formatAUD } from "@/lib/money";
import { requireAdmin } from "@/lib/requireAdmin";
import {
  createProductAction,
  deactivateProductAction,
  updateProductAction,
} from "./actions";
import ProductForm, { type ProductData } from "./ProductForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Products",
};

interface ProductRow {
  id: number;
  name: string;
  slug: string;
  description: string;
  active: number;
  featured: number;
  display_order: number;
}

interface VariantRow {
  id: number;
  product_id: number;
  label: string;
  weight_grams: number | null;
  price_cents: number;
  active: number;
  display_order: number;
}

export default function AdminProductsPage({
  searchParams,
}: {
  searchParams: { edit?: string; error?: string; saved?: string };
}) {
  requireAdmin();
  const db = getDb();

  const products = db
    .prepare(
      `SELECT id, name, slug, description, active, featured, display_order
       FROM products ORDER BY display_order, name`
    )
    .all() as ProductRow[];

  const allVariants = db
    .prepare(
      `SELECT id, product_id, label, weight_grams, price_cents, active, display_order
       FROM product_variants ORDER BY display_order, id`
    )
    .all() as VariantRow[];

  const variantsByProduct = new Map<number, VariantRow[]>();
  for (const v of allVariants) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  }

  const editIdRaw = Number.parseInt(searchParams.edit ?? "", 10);
  const editId = Number.isInteger(editIdRaw) ? editIdRaw : null;
  const editing = editId !== null ? products.find((p) => p.id === editId) : null;
  const isEdit = editing !== undefined && editing !== null;
  const showForm = isEdit || searchParams.edit === "new";
  const error = searchParams.error;
  const saved = searchParams.saved === "1";

  const emptyForm: ProductData = {
    name: "",
    description: "",
    active: true,
    featured: false,
    displayOrder: 0,
    variants: [],
  };

  const editForm: ProductData | null = editing
    ? {
        id: editing.id,
        name: editing.name,
        description: editing.description,
        active: editing.active === 1,
        featured: editing.featured === 1,
        displayOrder: editing.display_order,
        variants: (variantsByProduct.get(editing.id) ?? []).map((v) => ({
          id: v.id,
          label: v.label,
          weightGrams: v.weight_grams === null ? "" : String(v.weight_grams),
          price: (v.price_cents / 100).toFixed(2),
          active: v.active === 1,
        })),
      }
    : null;

  return (
    <>
      <h1 className="admin-page-title">Products</h1>
      <p className="admin-page-sub muted">
        Manage the biltong range, variants and ordering.
      </p>

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="notice" role="status">
          Saved.
        </p>
      )}

      {showForm ? (
        <section className="admin-card" aria-labelledby="form-heading">
          <h2 id="form-heading">
            {isEdit ? `Edit: ${editing!.name}` : "New product"}
          </h2>
          <ProductForm
            mode={isEdit ? "edit" : "create"}
            initial={isEdit ? editForm! : emptyForm}
            action={isEdit ? updateProductAction : createProductAction}
          />
        </section>
      ) : (
        <>
          <p>
            <Link href="/admin/products?edit=new" className="btn btn-primary btn-sm">
              + New product
            </Link>
          </p>

          <section className="admin-card">
            {products.length === 0 ? (
              <p className="muted">No products yet. Create the first one.</p>
            ) : (
              <div className="table-wrap">
                <table className="admin-table">
                  <caption className="visually-hidden">All products</caption>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Variants</th>
                      <th scope="col">Order</th>
                      <th scope="col">Active</th>
                      <th scope="col">Featured</th>
                      <th scope="col">
                        <span className="visually-hidden">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const vs = variantsByProduct.get(p.id) ?? [];
                      return (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.name}</strong>
                            <br />
                            <span className="muted small">/{p.slug}</span>
                          </td>
                          <td>
                            {vs.length === 0 ? (
                              <span className="muted small">None</span>
                            ) : (
                              <span className="small">
                                {vs
                                  .map(
                                    (v) =>
                                      `${v.label} (${formatAUD(v.price_cents)}${
                                        v.active ? "" : ", inactive"
                                      })`
                                  )
                                  .join(", ")}
                              </span>
                            )}
                          </td>
                          <td className="num">{p.display_order}</td>
                          <td>{p.active === 1 ? "Yes" : "No"}</td>
                          <td>{p.featured === 1 ? "Yes" : "No"}</td>
                          <td>
                            <div className="admin-actions">
                              <Link
                                href={`/admin/products?edit=${p.id}`}
                                className="btn btn-dark btn-sm"
                              >
                                Edit<span className="visually-hidden"> {p.name}</span>
                              </Link>
                              {p.active === 1 && (
                                <form action={deactivateProductAction}>
                                  <input type="hidden" name="productId" value={p.id} />
                                  <button type="submit" className="btn btn-sm">
                                    Deactivate
                                    <span className="visually-hidden"> {p.name}</span>
                                  </button>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
