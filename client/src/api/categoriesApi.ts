import axiosInstance from "./axiosInstance";
import type { Category } from "../types";

export async function getAllCategories(signal?: AbortSignal): Promise<Category[]> {
  const response = await axiosInstance.get<Category[]>("/categories", { signal, timeout: 65000 });
  return response.data;
}

export async function getCategoryById(id: string): Promise<Category> {
  const response = await axiosInstance.get<Category>(`/categories/${id}`);
  return response.data;
}
