import {
  Truck,
  PawPrint,
  Apple,
  House,
  Shirt,
  Users,
  Sun,
  Footprints,
  Palette,
} from "lucide-react";
export const categoryIcons: Record<string, typeof Truck> = {
  truck: Truck,
  paw: PawPrint,
  apple: Apple,
  home: House,
  shirt: Shirt,
  users: Users,
  sun: Sun,
  footprints: Footprints,
  palette: Palette,
};
export function CategoryIcon({
  name,
  size = 24,
}: {
  name: string;
  size?: number;
}) {
  const Icon = categoryIcons[name] || House;
  return <Icon size={size} strokeWidth={1.7} />;
}
