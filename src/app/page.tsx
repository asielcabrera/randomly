import RandomPicker from "@/components/RandomPicker";

// app/page.tsx (Server Component)
import RandomPickerPro from "@/components/RandomPickerPro";

export default function Home() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <RandomPickerPro />
    </main>
  );
}

