
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../utils/api";

// ---------------------------------------------------------
// VERIFY USER (silent auto-login from localStorage)
// ---------------------------------------------------------
export const verifyUser = createAsyncThunk(
  "auth/verifyUser",
  async (_, { rejectWithValue }) => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return rejectWithValue("No token");

    const endpoints = [
      "/profile",
      "/admin/profile",
      "/admin/me",
      "/auth/me",
    ];

    for (const ep of endpoints) {
      try {
        const res = await API.get(ep);

        return {
          ...res.data,
          role: localStorage.getItem("role") || res.data.role,
        };
      } catch (err) {
        continue;
      }
    }

    // ❌ All endpoints failed → clear everything
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("role");

    return rejectWithValue("Invalid token");
  }
);

// ---------------------------------------------------------
// AUTH SLICE
// ---------------------------------------------------------
const authSlice = createSlice({
  name: "auth",

  initialState: {
    user: JSON.parse(localStorage.getItem("user")) || null,
    token: localStorage.getItem("accessToken") || null,
    isAuthenticated: !!localStorage.getItem("accessToken"),
    role: localStorage.getItem("role") || null,
    loading: false,
    error: null,
  },

  reducers: {
    // LOGIN SUCCESS
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.role = action.payload.user.role.toLowerCase();
      state.loading = false;

      // Persist to localStorage
      localStorage.setItem("user", JSON.stringify(action.payload.user));
      localStorage.setItem("accessToken", action.payload.token);
      localStorage.setItem("role", state.role);
    },

    // LOGOUT
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.role = null;
      state.loading = false;

      // Clear localStorage (no refreshToken!)
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(verifyUser.pending, (state) => {
        state.loading = true;
      })

      .addCase(verifyUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload;

        state.role =
          (action.payload.role || localStorage.getItem("role") || "").toLowerCase();

        state.loading = false;

        // Persist user + role
        localStorage.setItem("user", JSON.stringify(state.user));
        localStorage.setItem("role", state.role);
      })

      .addCase(verifyUser.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.role = null;
        state.token = null;
        state.loading = false;

        // Clear all storage (refreshToken removed)
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
      });
  },
});

// ---------------------------------------------------------
export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
