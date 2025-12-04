import { Router } from "express";
import { getHomeInventory } from "./home-inventory-controller";

export function homeInventoryRouter() {
  const router = Router();
  router.get("/", getHomeInventory);
}
