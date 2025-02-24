

import axios from "axios";

export const API_URL = "https://archery-new-backend.onrender.com";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
