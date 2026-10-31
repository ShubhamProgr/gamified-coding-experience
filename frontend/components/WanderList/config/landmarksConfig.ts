export type Landmark = {
  name: string;
  icon: string;
  color: string;
  category: string;
};

export const LANDMARKS: Landmark[] = [
  { name: "Grand Hotel", icon: "🏨", color: "#f59e0b", category: "hotel" },
  { name: "Café de Flore", icon: "☕", color: "#f43f5e", category: "cafe" },
  { name: "City Museum", icon: "🏛️", color: "#38bdf8", category: "museum" },
  { name: "Clock Tower", icon: "🕰️", color: "#10b981", category: "monument" },
  { name: "Sunset Lookout", icon: "🌲", color: "#8b5cf6", category: "viewpoint" },
];
