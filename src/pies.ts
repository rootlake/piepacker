// Define the structure for pie data
export interface Pie {
  name: string;
  radius: number;
  assetKey: string;
}

// Define pies in size order
export const pies: Pie[] = [
  { name: "Lemon Tart", radius: 20, assetKey: "lemon_tart" },         // Smallest
  { name: "Apple Cross", radius: 28, assetKey: "apple_cross" },      // Rescaled
  { name: "Apple Square", radius: 35, assetKey: "apple_square" },   // Replaced Apple Crumble
  { name: "Blueberry Pie", radius: 43, assetKey: "blueberry" },       // Rescaled
  { name: "Cherry Pie", radius: 50, assetKey: "cherry_cross" },     // Renamed
  { name: "Chocolate Cream Pie", radius: 58, assetKey: "chocolate_cream" },// Rescaled
  { name: "Custard Pie", radius: 65, assetKey: "custard" },           // Renamed
  { name: "Key Lime Pie", radius: 73, assetKey: "key_lime" },         // Rescaled
  { name: "Lemon Meringue Pie", radius: 80, assetKey: "lemon_meringue" }, // Rescaled
  { name: "Oreo Pie", radius: 88, assetKey: "oreo" },               // Rescaled
  { name: "Pecan Pie", radius: 95, assetKey: "pecan" },              // Rescaled
  { name: "Pumpkin Pie", radius: 103, assetKey: "pumpkin" },         // Rescaled
  { name: "Raspberry Pie", radius: 110, assetKey: "raspberry" },       // Rescaled
  { name: "Strawberry Rhubarb Pie", radius: 118, assetKey: "shoofly" },         // Rescaled
  { name: "Tomato Pie", radius: 125, assetKey: "tomato" },          // Rescaled
  { name: "Tollhouse Cookie Pie", radius: 133, assetKey: "tollhouse" },       // Rescaled
  { name: "Chicken Pot Pie", radius: 140, assetKey: "chicken" },    // Rescaled
  { name: "Pizza Pie", radius: 148, assetKey: "pizza_pie" },      // Largest
]; 