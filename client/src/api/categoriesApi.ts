import axiosInstance from "./axiosInstance";
import type { Category } from "../types";

export async function getAllCategories(): Promise<Category[]> {
  const response = await axiosInstance.get<Category[]>("/categories");
  return response.data;
}

export async function createCategory(name: string): Promise<Category> {
  const response = await axiosInstance.post<Category>("/categories", { name });
  return response.data;
}
