import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../utils/api";

export const verifyUser = createAsyncThunk(
  "auth/verifyUser",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("token");
    if (!token) {
      return rejectWithValue("No token found");
    }

    // try several endpoints that might return logged-in user
    const endpoints = ["/profile", "/admin/profile", "/admin/me", "/auth/me"];
    for (const ep of endpoints) {
      try {
        const response = await API.get(ep);
        // return user data + role (prefer stored role if present)
        return { ...response.data, role: localStorage.getItem("role") || response.data.role };
      } catch (err) {
        // try next endpoint
        continue;
      }
    }

    // all attempts failed -> clear token and reject
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    return rejectWithValue("Token invalid or endpoints missing");
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    isAuthenticated: false,
    role: null,
    loading: false, // <- set false initially
    error: null,
  },
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.role = action.payload.user.role;
      state.loading = false;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.role = null;
      state.loading = false;
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("name");
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
        state.role = action.payload.role || localStorage.getItem("role");
        state.loading = false;
      })
      .addCase(verifyUser.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.role = null;
        state.loading = false;
      });
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;