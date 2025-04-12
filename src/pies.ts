// Define the structure for pie data
export interface Pie {
  name: string;
  radius: number;
  assetKey: string;
}

// Define pies in size order
export const pies: Pie[] = [
  { name: "Raspberry Mini", radius: 40, assetKey: "raspberry_mini" },
  { name: "Lemon Tart", radius: 50, assetKey: "lemon_tart" },
  { name: "Apple Cross", radius: 60, assetKey: "apple_cross" },
  { name: "Blueberry Pie", radius: 70, assetKey: "blueberry" },
  { name: "Cherry Pie", radius: 75, assetKey: "cherry_cross" },
  { name: "Chocolate Cream Pie", radius: 80, assetKey: "chocolate_cream" },
  { name: "Custard Pie", radius: 85, assetKey: "custard" },
  { name: "Key Lime Pie", radius: 90, assetKey: "key_lime" },
  { name: "Lemon Meringue Pie", radius: 95, assetKey: "lemon_meringue" },
  { name: "Oreo Pie", radius: 100, assetKey: "oreo" },
  { name: "Pecan Pie", radius: 105, assetKey: "pecan" },
  { name: "Pumpkin Pie", radius: 110, assetKey: "pumpkin" },
  { name: "Raspberry Pie", radius: 115, assetKey: "raspberry" },
  { name: "Strawberry Rhubarb Pie", radius: 120, assetKey: "strawberry_rhubarb" },
  { name: "Tomato Pie", radius: 125, assetKey: "tomato" },
  { name: "Tollhouse Cookie Pie", radius: 130, assetKey: "tollhouse" },
  { name: "Chicken Pot Pie", radius: 140, assetKey: "chicken" },
  { name: "Pizza Pie", radius: 150, assetKey: "pizza_pie" },
]; 