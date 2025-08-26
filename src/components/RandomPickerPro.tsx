"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

// ...imports UI omitidos por brevedad
import { safeLoadRaw, safeSave } from "@/lib/storage";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { Download, Upload, Plus, Shuffle, Trash2, X, Settings2, Weight, List as ListIcon, History } from "lucide-react";

// ----- Tipos -----
type Item = { id: string; text: string; weight: number }; // weight: 1..10
type PersistedState = { items: Item[]; history: string[]; avoidRepeats: boolean };

// ----- Utilidades -----
const uid = () => Math.random().toString(36).slice(2, 10);

function pickWeighted<T extends { weight: number }>(arr: T[]): number {
  const total = arr.reduce((s, x) => s + (x.weight || 1), 0);
  const r = Math.random() * total;
  let acc = 0;
  for (let i = 0; i < arr.length; i++) {
    acc += arr[i].weight || 1;
    if (r <= acc) return i;
  }
  return arr.length - 1;
}

// Normaliza cualquier forma previa del storage a la estructura nueva
function normalizeState(raw: unknown): PersistedState {
  // Caso 1: versión muy vieja -> string[]
  if (Array.isArray(raw)) {
    return {
      items: raw.map((t) => ({ id: uid(), text: String(t), weight: 5 })),
      history: [],
      avoidRepeats: true,
    };
  }
  // Caso 2: objeto con items (posible mezcla de formatos)
  if (raw && typeof raw === "object") {
    const r = raw as any;
    const itemsSrc = Array.isArray(r.items) ? r.items : [];
    const items: Item[] = itemsSrc.map((x: any) => ({
      id: x?.id ?? uid(),
      text: String(x?.text ?? ""),
      weight: Number.isFinite(x?.weight) ? Math.max(1, Math.min(10, Number(x.weight))) : 5,
    })).filter((i: Item) => i.text.length > 0);

    const history = Array.isArray(r.history) ? r.history.map(String) : [];
    const avoidRepeats = Boolean(r.avoidRepeats ?? true);

    return { items, history, avoidRepeats };
  }
  // Caso 3: nada válido
  return { items: [], history: [], avoidRepeats: true };
}



export default function RandomPickerPro() {
  // Guard de montaje
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

    // Lee y normaliza en el inicializador de useState (solo se ejecuta una vez)
  const [state, setState] = useState<PersistedState>(() => {
    // intenta la clave actual
    const raw = safeLoadRaw<unknown>("random-items-pro", null);
    const normalized = normalizeState(raw);
    if (!raw) {
      // migración automática desde claves antiguas
      const legacy = safeLoadRaw<unknown>("random-items", null);
      const legacy2 = safeLoadRaw<unknown>("random-items-pro-backup", null);
      const candidate = normalizeState(legacy ?? legacy2);
      if (candidate.items.length) return candidate;
    }
    return normalized;
  });

   // Persiste cada cambio
  useEffect(() => {
    if (!mounted) return;
    safeSave(state, "random-items-pro");
  }, [state, mounted]);

  // GUARD: no asumas que state o items existen
  const hasItems = (state?.items?.length ?? 0) > 0;
  

  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Persistencia
  useEffect(() => {
    if (!mounted) return;
    safeSave(state, "random-items-pro");
  }, [state, mounted]);



  // -------- Acciones base --------
  const addItem = () => {
    const t = input.trim();
    if (!t) return;
    setState((s) => ({ ...s, items: [...s.items, { id: uid(), text: t, weight: 5 }] }));
    setInput("");
  };

  const removeItem = (id: string) => {
    setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
    if (selected && state.items.find((i) => i.id === id)?.text === selected) {
      setSelected(null);
    }
  };

  const clearAll = () => {
    setState((s) => ({ ...s, items: [] }));
    setCursor(null);
    setSelected(null);
  };

  const setWeight = (id: string, w: number) => {
    setState((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === id ? { ...i, weight: w } : i)),
    }));
  };

  // -------- Import / Export --------
  const fileRef = useRef<HTMLInputElement | null>(null);

  const exportJson = () => {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "random-picker-pro.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file?: File) => {
    const f = file ?? fileRef.current?.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as PersistedState | { items: Array<{ text: string }> };
        if ("items" in parsed && Array.isArray(parsed.items)) {
          // admitir formatos antiguos
          const items: Item[] = (parsed as any).items.map((x: any) => ({
            id: x.id ?? uid(),
            text: String(x.text),
            weight: Number(x.weight ?? 5),
          }));
          setState({
            items,
            history: "history" in parsed && Array.isArray((parsed as any).history) ? (parsed as any).history : [],
            avoidRepeats: "avoidRepeats" in parsed ? Boolean((parsed as any).avoidRepeats) : true,
          });
        } else {
          alert("JSON inválido.");
        }
      } catch {
        alert("JSON inválido.");
      }
    };
    reader.readAsText(f);
  };

  // -------- Agregado masivo --------
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const addBulk = () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (!lines.length) return;
    setState((s) => ({
      ...s,
      items: [...s.items, ...lines.map((t) => ({ id: uid(), text: t, weight: 5 }))],
    }));
    setBulkText("");
    setBulkOpen(false);
  };

  // -------- Selección con animación --------
  const visibleItems = useMemo(() => {
    // si avoidRepeats: filtra los ganadores recientes (último igual al actual seleccionado)
    if (!state.avoidRepeats || state.history.length === 0) return state.items;
    const last = state.history[0];
    return state.items.filter((i) => i.text !== last);
  }, [state.items, state.avoidRepeats, state.history]);

  const scrollIntoView = (idx: number) => {
    const el = rowRefs.current[idx];
    const box = listRef.current;
    if (el && box) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const pickRandom = () => {
    if (!hasItems || spinning) return;

    // dataset con pesos (sobre visibleItems)
    const pool = visibleItems.length ? visibleItems : state.items;
    if (!pool.length) return;

    setSelected(null);
    setSpinning(true);

    const total = 1000 + Math.random() * 600;
    const start = performance.now();

    const run = (t: number) => {
      const elapsed = t - start;
      const p = Math.min(elapsed / total, 1);
      const ease = 1 - Math.pow(1 - p, 3);

      const steps = Math.max(10, Math.floor(14 + pool.length * 1.6));
      const idx = Math.floor(ease * steps) % pool.length;

      const absoluteIndex = state.items.findIndex((x) => x.id === pool[idx].id);
      setCursor(absoluteIndex);
      scrollIntoView(absoluteIndex);

      if (p < 1) {
        requestAnimationFrame(run);
      } else {
        // ganador ponderado
        const wIndexInPool = pickWeighted(pool);
        const winner = pool[wIndexInPool];
        const absolute = state.items.findIndex((x) => x.id === winner.id);

        setCursor(absolute);
        setSelected(winner.text);
        scrollIntoView(absolute);

        // push al historial (últimos 20)
        setState((s) => ({
          ...s,
          history: [winner.text, ...s.history].slice(0, 20),
        }));

        setTimeout(() => setSpinning(false), 120);
      }
    };

    requestAnimationFrame(run);
  };

  if (!mounted) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="w-full max-w-4xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold tracking-tight">Random Picker Pro</CardTitle>

          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={() => importJson()}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={exportJson} title="Exportar JSON">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exportar JSON</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileRef.current?.click()}
                  title="Importar JSON"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Importar JSON</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" size="icon" onClick={clearAll} disabled={!hasItems} title="Limpiar lista">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Limpiar lista</TooltipContent>
            </Tooltip>

            <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="icon" title="Agregado masivo">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar múltiples ítems</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={"Uno por línea...\nPizza\nBurger\nSushi"}
                    className="w-full h-40 rounded-md border bg-background p-2 text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setBulkOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={addBulk}>Agregar</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Top bar: agregar + settings */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Agregar ítem…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
              />
              <Button onClick={addItem}>Agregar</Button>
            </div>

            <Separator className="md:hidden" />

            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="justify-center">
                <ListIcon className="h-3.5 w-3.5 mr-1" />
                {state.items.length}
              </Badge>

              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 opacity-60" />
                <span className="text-sm opacity-80">Evitar repetidos</span>
                <Switch
                  checked={state.avoidRepeats}
                  onCheckedChange={(v) => setState((s) => ({ ...s, avoidRepeats: v }))}
                />
              </div>
            </div>
          </div>

          <Tabs defaultValue="picker" className="w-full">
            <TabsList className="grid grid-cols-3 w-full md:w-auto">
              <TabsTrigger value="picker">Selector</TabsTrigger>
              <TabsTrigger value="items">Ítems</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>

            {/* -------- Selector -------- */}
            <TabsContent value="picker" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Lista compacta */}
                <div className="md:col-span-3">
                  <div ref={listRef} className="rounded-md border p-3 max-h-80 overflow-auto bg-card/30 backdrop-blur">
                    {!hasItems ? (
                      <p className="text-sm opacity-70">No hay elementos. Agrega algunos arriba.</p>
                    ) : (
                      <ul className="space-y-2">
                        {state.items.map((i, idx) => {
                          const isCursor = cursor === idx;
                          const isWinner = selected === i.text;
                          return (
                            <motion.li
                              key={i.id}
                            //   ref={(el) => (rowRefs.current[idx] = el)}
                              layout
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.15 }}
                              className={clsx(
                                "flex items-center justify-between gap-2 rounded-md px-2 py-1 border",
                                "bg-background",
                                isWinner && "ring-2 ring-primary/70 bg-primary/5",
                                isCursor && !isWinner && "bg-muted"
                              )}
                            >
                              <span className="text-sm truncate">{i.text}</span>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Weight className="h-3.5 w-3.5 opacity-60" />
                                  <span className="text-xs tabular-nums opacity-80">{i.weight}</span>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost">
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => removeItem(i.id)}>
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </motion.li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Lado derecho: acción + resultado */}
                <div className="md:col-span-2 flex flex-col items-center justify-center gap-4">
                  <motion.div whileTap={{ scale: hasItems && !spinning ? 0.97 : 1 }}>
                    <Button className="w-48 h-12 gap-2" onClick={pickRandom} disabled={!hasItems || spinning}>
                      <Shuffle className="h-4 w-4" />
                      {spinning ? "Buscando…" : "Seleccionar"}
                    </Button>
                  </motion.div>

                  <AnimatePresence>
                    {selected && !spinning && (
                      <motion.div
                        key={selected}
                        initial={{ opacity: 0, y: -8, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.25 }}
                        className="text-2xl font-semibold text-center"
                      >
                        🎯 {selected}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="text-xs opacity-70 text-center">
                    La probabilidad de cada ítem depende de su <em>peso</em>.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* -------- Ítems (gestión y pesos) -------- */}
            <TabsContent value="items" className="space-y-3">
              {!hasItems ? (
                <p className="text-sm opacity-70">No hay elementos. Agrega algunos en “Selector”.</p>
              ) : (
                <div className="space-y-3">
                  {state.items.map((i) => (
                    <div
                      key={i.id}
                      className="flex flex-col md:flex-row md:items-center gap-3 rounded-md border p-3 bg-card/30"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{i.text}</div>
                        <div className="text-xs opacity-70">Peso: {i.weight}</div>
                      </div>
                      <div className="md:w-80">
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          value={[i.weight]}
                          onValueChange={([v]) => setWeight(i.id, v)}
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(i.id)} title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* -------- Historial -------- */}
            <TabsContent value="history" className="space-y-3">
              {state.history.length === 0 ? (
                <p className="text-sm opacity-70">Aún no hay ganadores.</p>
              ) : (
                <div className="space-y-2">
                  {state.history.map((h, idx) => (
                    <div
                      key={`${h}-${idx}`}
                      className="flex items-center justify-between rounded-md border p-2 bg-background"
                    >
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 opacity-60" />
                        <span className="text-sm">{h}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        #{idx + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
