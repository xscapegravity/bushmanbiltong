"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ProductData {
  id?: number;
  name: string;
  description: string;
  active: boolean;
  featured: boolean;
  displayOrder: number;
  variants: {
    id: number | null;
    label: string;
    weightGrams: string;
    price: string;
    active: boolean;
  }[];
}

interface Props {
  mode: "create" | "edit";
  initial: ProductData;
  action: (formData: FormData) => void;
  error?: string;
}

const emptyVariant = {
  id: null as number | null,
  label: "",
  weightGrams: "",
  price: "",
  active: true,
};

function makeInitialVariants(initial: ProductData): ProductData["variants"] {
  // Start the create form with one empty row; edit form keeps its loaded rows.
  if (initial.variants.length === 0) return [{ ...emptyVariant }];
  return initial.variants;
}

export default function ProductForm({ mode, initial, action, error }: Props) {
  const router = useRouter();
  const [variants, setVariants] = useState(makeInitialVariants(initial));

  const updateVariant = (i: number, patch: Partial<typeof emptyVariant>) => {
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  };

  const addVariant = () => setVariants((vs) => [...vs, { ...emptyVariant }]);
  const removeVariant = (i: number) => setVariants((vs) => vs.filter((_, idx) => idx !== i));

  return (
    <form action={action} className="admin-form">
      {mode === "edit" && <input type="hidden" name="productId" value={initial.id} />}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      <div className="field">
        <label htmlFor="name">Product name</label>
        <input
          id="name"
          type="text"
          name="name"
          defaultValue={initial.name}
          required
        />
        <span className="hint">The URL slug is generated automatically from the name.</span>
      </div>

      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} defaultValue={initial.description}></textarea>
      </div>

      <div className="admin-form-row">
        <div className="field">
          <label htmlFor="displayOrder">Display order</label>
          <input
            id="displayOrder"
            type="text"
            inputMode="numeric"
            name="displayOrder"
            defaultValue={String(initial.displayOrder)}
          />
        </div>
        <div className="checkbox-field" style={{ alignSelf: "end", paddingBottom: 12 }}>
          <input
            id="active"
            type="checkbox"
            name="active"
            defaultChecked={initial.active}
          />
          <label htmlFor="active" style={{ margin: 0 }}>
            Active
          </label>
        </div>
        <div className="checkbox-field" style={{ alignSelf: "end", paddingBottom: 12 }}>
          <input
            id="featured"
            type="checkbox"
            name="featured"
            defaultChecked={initial.featured}
          />
          <label htmlFor="featured" style={{ margin: 0 }}>
            Featured
          </label>
        </div>
      </div>

      <fieldset
        style={{ border: "none", padding: 0, margin: 0 }}
        aria-label="Variants"
      >
        <legend style={{ fontWeight: 700, padding: 0, marginBottom: 10 }}>
          Variants
        </legend>
        {variants.map((v, i) => (
          <div className="variant-row" key={v.id ?? `new-${i}`}>
            <input type="hidden" name="variantId" value={v.id ?? ""} />
            <div className="field">
              <label htmlFor={`vlabel-${i}`}>Label</label>
              <input
                id={`vlabel-${i}`}
                type="text"
                name="variantLabel"
                value={v.label}
                onChange={(e) => updateVariant(i, { label: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`vweight-${i}`}>Weight (g)</label>
              <input
                id={`vweight-${i}`}
                type="text"
                inputMode="numeric"
                name="variantWeightGrams"
                value={v.weightGrams}
                onChange={(e) => updateVariant(i, { weightGrams: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`vprice-${i}`}>Price ($)</label>
              <input
                id={`vprice-${i}`}
                type="text"
                inputMode="decimal"
                name="variantPrice"
                value={v.price}
                onChange={(e) => updateVariant(i, { price: e.target.value })}
              />
            </div>
            <div className="checkbox-field">
              <input
                id={`vactive-${i}`}
                type="checkbox"
                name="variantActive"
                defaultChecked={v.active}
              />
              <label htmlFor={`vactive-${i}`} style={{ margin: 0 }}>
                Active
              </label>
            </div>
            <div style={{ paddingBottom: 2 }}>
              <button
                type="button"
                className="btn btn-dark btn-sm"
                onClick={() => removeVariant(i)}
              >
                Remove<span className="visually-hidden"> variant {v.label || i + 1}</span>
              </button>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <button type="button" className="btn btn-sm" onClick={addVariant}>
            + Add variant
          </button>
        </div>
      </fieldset>

      <div className="admin-actions">
        <button type="submit" className="btn btn-primary">
          {mode === "create" ? "Create product" : "Save changes"}
        </button>
        <button
          type="button"
          className="btn btn-dark"
          onClick={() => router.push("/admin/products")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
