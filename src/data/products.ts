export interface Product {
  id: string;
  name: string;
  price: number;
  category: "electronics" | "clothing" | "groceries" | "medicine" | "candy" | "general";
  description: string;
  image: string; // emoji
}

export const demoProducts: Product[] = [
  {
    id: "laptop",
    name: "Laptop Computer",
    price: 999.0,
    category: "electronics",
    description: "15-inch laptop — taxable in all states with sales tax",
    image: "💻",
  },
  {
    id: "tshirt",
    name: "Cotton T-Shirt",
    price: 45.0,
    category: "clothing",
    description: "Basic everyday clothing — exempt in some states",
    image: "👕",
  },
  {
    id: "winter-jacket",
    name: "Winter Jacket",
    price: 275.0,
    category: "clothing",
    description: "Priced above some partial exemption thresholds ($110 NY, $250 RI)",
    image: "🧥",
  },
  {
    id: "groceries",
    name: "Bag of Groceries",
    price: 35.0,
    category: "groceries",
    description: "Unprepared food for home consumption",
    image: "🛒",
  },
  {
    id: "prescription",
    name: "Prescription Medicine",
    price: 50.0,
    category: "medicine",
    description: "Prescription drugs — exempt in virtually all states",
    image: "💊",
  },
  {
    id: "candy",
    name: "Candy Bar",
    price: 2.0,
    category: "candy",
    description: "Candy is excluded from food exemptions in most states",
    image: "🍫",
  },
];
