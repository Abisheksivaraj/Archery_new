

import axios from "axios";

export const API_URL = "https://archery-new.onrender.com"; 
// export const API_URL="http://localhost:5555";
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
