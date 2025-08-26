"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeLoad, safeSave } from "@/lib/storage";
import { X, Trash2, Upload, Download, Shuffle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export default function RandomPicker() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [items, setItems] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  // animación
  const [spinning, setSpinning] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null); // índice que “parpadea” durante el spin
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (!mounted) return;
    setItems(safeLoad());
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    safeSave(items);
  }, [items, mounted]);

  const hasItems = items.length > 0;

  const addItem = () => {
    const v = input.trim();
    if (!v) return;
    setItems((prev) => [...prev, v]);
    setInput("");
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    if (selected && items[idx] === selected) setSelected(null);
  };

  const clearAll = () => {
    setItems([]);
    setSelected(null);
    setCursor(null);
  };

  // Desplazar al ítem visible
  const scrollItemIntoView = (idx: number) => {
    const el = rowRefs.current[idx];
    const box = listContainerRef.current;
    if (el && box) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // Roulette spin
  const pickRandom = () => {
    if (!hasItems || spinning) return;

    setSelected(null);
    setSpinning(true);

    // duración total 1000–1500ms con easing (rápido -> lento)
    const total = 1000 + Math.random() * 500;
    const start = performance.now();

    const run = (t: number) => {
      const elapsed = t - start;
      const progress = Math.min(elapsed / total, 1);

      // velocidad decreciente (easeOutCubic)
      const ease = 1 - Math.pow(1 - progress, 3);
      // pasos “virtuales” sobre la lista
      const steps = Math.max(8, Math.floor(12 + items.length * 1.5));
      const idx = Math.floor(ease * steps) % items.length;

      setCursor(idx);
      scrollItemIntoView(idx);

      if (progress < 1) {
        requestAnimationFrame(run);
      } else {
        const finalIndex = Math.floor(Math.random() * items.length);
        setCursor(finalIndex);
        setSelected(items[finalIndex]);
        scrollItemIntoView(finalIndex);
        setTimeout(() => setSpinning(false), 80);
      }
    };

    requestAnimationFrame(run);
  };

  // Import / Export
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "random-items.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file?: File) => {
    const f = file ?? fileInputRef.current?.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
          setItems(parsed);
        } else {
          alert("El JSON debe ser un array de strings.");
        }
      } catch {
        alert("JSON inválido.");
      }
    };
    reader.readAsText(f);
  };

  if (!mounted) return null;

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Random Picker</span>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={exportJson} title="Exportar JSON">
              <Download className="h-4 w-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={() => importJson()}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              title="Importar JSON"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={clearAll}
              disabled={!hasItems}
              title="Limpiar lista"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex gap-2">
          <Input
            placeholder="Agregar ítem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addItem();
            }}
          />
          <Button onClick={addItem}>Agregar</Button>
        </div>

        <div
          ref={listContainerRef}
          className="rounded-md border p-3 max-h-64 overflow-auto"
        >
          {!hasItems ? (
            <p className="text-sm opacity-70">No hay elementos. Agrega algunos arriba.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item, i) => {
                const isCursor = cursor === i;
                const isWinner = selected === item;

                return (
                  <motion.li
                    key={`${item}-${i}`}
                    // ref={(el) => (rowRefs.current[i] = el)}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={clsx(
                      "flex items-center justify-between gap-2 rounded-md px-2 py-1",
                      isWinner && "ring-2 ring-primary/70 bg-primary/5",
                      isCursor && !isWinner && "bg-muted"
                    )}
                  >
                    <motion.span
                      animate={
                        isCursor
                          ? { scale: 1.025 }
                          : isWinner
                          ? { scale: [1, 1.08, 1] }
                          : { scale: 1 }
                      }
                      transition={
                        isWinner
                          ? { duration: 0.5, times: [0, 0.5, 1], ease: "easeOut" }
                          : { duration: 0.08 }
                      }
                      className="text-sm"
                    >
                      {item}
                    </motion.span>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(i)}
                      title="Eliminar"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: hasItems ? 1.02 : 1 }}>
            <Button onClick={pickRandom} disabled={!hasItems || spinning} className="gap-2">
              <Shuffle className="h-4 w-4" />
              {spinning ? "Buscando..." : "Seleccionar al azar"}
            </Button>
          </motion.div>

          <AnimatePresence>
            {selected && !spinning && (
              <motion.p
                key={selected}
                initial={{ opacity: 0, y: -8, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="text-xl font-semibold tracking-wide"
              >
                🎯 {selected}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
