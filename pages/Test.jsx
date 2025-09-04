// pages/Test.jsx
import React, { useState } from "react";
import Button from "../components/Button";
import {
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  ExternalLink,
  Save,
  LogIn,
} from "lucide-react";

export default function Test() {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleFakeSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1200);
  };

  const handleFakeDelete = () => {
    setDeleting(true);
    setTimeout(() => setDeleting(false), 1200);
  };

  return (
    <div className="min-h-screen bg-black text-white md:p-8">
      <div className="max-w-5xl mx-auto space-y-10">
        <header>
          <h1 className="text-2xl font-bold">UI Button — Test Page</h1>
          <p className="text-sm text-white/70">
            Variants, sizes, icons, loading, disabled & links
          </p>
        </header>

        <div className="p-4 bg-red-500 text-white">Tailwind merge</div>

        {/* VARIANTS */}
        <section className="bg-white rounded-xl p-6 text-black shadow">
          <h2 className="text-lg font-semibold mb-4">Variants</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" leftIcon={<Save className="w-4 h-4" />}>
              Primary
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button
              variant="danger"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={handleFakeDelete}
              isLoading={deleting}
            >
              Delete
            </Button>
            <Button variant="ghost" leftIcon={<Pencil className="w-4 h-4" />}>
              Edit (Ghost)
            </Button>
            <Button
              variant="link"
              href="https://example.com"
              rightIcon={<ExternalLink className="w-4 h-4" />}
              target="_blank"
              rel="noreferrer"
            >
              Open link
            </Button>
          </div>
        </section>

        {/* SIZES */}
        <section className="bg-white rounded-xl p-6 text-black shadow">
          <h2 className="text-lg font-semibold mb-4">Sizes</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" size="md">
              Medium
            </Button>
            <Button variant="primary" size="lg">
              Large
            </Button>
            <Button variant="secondary" size="icon" aria-label="Add">
              <Plus className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Edit">
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* ICONS & STATES */}
        <section className="bg-white rounded-xl p-6 text-black shadow">
          <h2 className="text-lg font-semibold mb-4">Icons & States</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              leftIcon={<Check className="w-4 h-4" />}
              onClick={handleFakeSave}
              isLoading={saving}
            >
              Save changes
            </Button>

            <Button
              variant="secondary"
              rightIcon={<X className="w-4 h-4" />}
              onClick={() => {}}
            >
              Cancel
            </Button>

            <Button variant="outline" disabled>
              Disabled
            </Button>

            <Button
              variant="danger"
              leftIcon={<Trash2 className="w-4 h-4" />}
              disabled
            >
              Delete (disabled)
            </Button>

            <Button
              variant="ghost"
              leftIcon={<LogIn className="w-4 h-4" />}
              onClick={() => {}}
            >
              Sign in
            </Button>
          </div>
        </section>

        {/* AS LINK VS BUTTON */}
        <section className="bg-white rounded-xl p-6 text-black shadow">
          <h2 className="text-lg font-semibold mb-4">As link vs button</h2>
          <div className="flex flex-wrap gap-3">
            {/* Button semantic */}
            <Button variant="primary" type="submit">
              Submit form
            </Button>

            {/* Anchor semantic (auto <a> când are href) */}
            <Button
              variant="outline"
              href="https://instagram.com/"
              target="_blank"
              rel="noreferrer"
              rightIcon={<ExternalLink className="w-4 h-4" />}
            >
              Instagram
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
