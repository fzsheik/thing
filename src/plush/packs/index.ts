import type { PlushPack } from "../plush-kit.ts";
import { distinguished } from "./distinguished.ts";
import { sorcerers } from "./sorcerers.ts";

export const plushPacks: PlushPack[] = [distinguished, sorcerers];
export const animePacks = [sorcerers];

export function getPlushPack(id: string) {
  return plushPacks.find(p => p.id === id);
}
