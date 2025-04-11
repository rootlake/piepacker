// Define the structure for pie data
export interface Pie {
  name: string;
  radius: number;
  assetKey: string;
}

// Define pies in size order
export const pies: Pie[] = [
  { name: "Raspberry Mini", radius: 15, assetKey: "raspberry_mini" },
  { name: "Lemon Tart", radius: 20, assetKey: "lemon_tart" },
  { name: "Apple Cross", radius: 28, assetKey: "apple_cross" },
  { name: "Blueberry Pie", radius: 43, assetKey: "blueberry" },
  { name: "Cherry Pie", radius: 50, assetKey: "cherry_cross" },
  { name: "Chocolate Cream Pie", radius: 58, assetKey: "chocolate_cream" },
  { name: "Custard Pie", radius: 65, assetKey: "custard" },
  { name: "Key Lime Pie", radius: 73, assetKey: "key_lime" },
  { name: "Lemon Meringue Pie", radius: 80, assetKey: "lemon_meringue" },
  { name: "Oreo Pie", radius: 88, assetKey: "oreo" },
  { name: "Pecan Pie", radius: 95, assetKey: "pecan" },
  { name: "Pumpkin Pie", radius: 103, assetKey: "pumpkin" },
  { name: "Raspberry Pie", radius: 110, assetKey: "raspberry" },
  { name: "Strawberry Rhubarb Pie", radius: 118, assetKey: "strawberry_rhubarb" },
  { name: "Tomato Pie", radius: 125, assetKey: "tomato" },
  { name: "Tollhouse Cookie Pie", radius: 133, assetKey: "tollhouse" },
  { name: "Chicken Pot Pie", radius: 140, assetKey: "chicken" },
  { name: "Pizza Pie", radius: 148, assetKey: "pizza_pie" },
]; 