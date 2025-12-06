// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import API from "../../utils/api";

// export const verifyUser = createAsyncThunk(
//   "auth/verifyUser",
//   async (_, { rejectWithValue }) => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       return rejectWithValue("No token found");
//     }

//     // try several endpoints that might return logged-in user
//     const endpoints = ["/profile", "/admin/profile", "/admin/me", "/auth/me"];
//     for (const ep of endpoints) {
//       try {
//         const response = await API.get(ep);
//         // return user data + role (prefer stored role if present)
//         return { ...response.data, role: localStorage.getItem("role") || response.data.role };
//       } catch (err) {
//         // try next endpoint
//         continue;
//       }
//     }

//     // all attempts failed -> clear token and reject
//     localStorage.removeItem("token");
//     localStorage.removeItem("role");
//     return rejectWithValue("Token invalid or endpoints missing");
//   }
// );

// const authSlice = createSlice({
//   name: "auth",
//   initialState: {
//     user: null,
//     isAuthenticated: false,
//     role: null,
//     loading: false, // <- set false initially
//     error: null,
//   },
//   reducers: {
//     loginSuccess: (state, action) => {
//       state.user = action.payload.user;
//       state.isAuthenticated = true;
//       state.role = action.payload.user.role;
//       state.loading = false;
//     },
//     logout: (state) => {
//       state.user = null;
//       state.isAuthenticated = false;
//       state.role = null;
//       state.loading = false;
//       localStorage.removeItem("token");
//       localStorage.removeItem("role");
//       localStorage.removeItem("name");
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(verifyUser.pending, (state) => {
//         state.loading = true;
//       })
//       .addCase(verifyUser.fulfilled, (state, action) => {
//         state.isAuthenticated = true;
//         state.user = action.payload;
//         state.role = action.payload.role || localStorage.getItem("role");
//         state.loading = false;
//       })
//       .addCase(verifyUser.rejected, (state) => {
//         state.isAuthenticated = false;
//         state.user = null;
//         state.role = null;
//         state.loading = false;
//       });
//   },
// });

// export const { loginSuccess, logout } = authSlice.actions;
// export default authSlice.reducer;


// src/features/auth/authSlice.js
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

    // ❌ All endpoints failed → clear & logout
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    localStorage.removeItem("user");

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
      state.token = action.payload.token; // accessToken
      state.isAuthenticated = true;
      state.role = action.payload.user.role.toLowerCase();
      state.loading = false;

      // Persist new values
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

      // Clear storage
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
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
          (action.payload.role ||
            localStorage.getItem("role") ||
            "").toLowerCase();

        state.loading = false;

        // Persist updated info
        localStorage.setItem("user", JSON.stringify(state.user));
        localStorage.setItem("role", state.role);
      })

      .addCase(verifyUser.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.role = null;
        state.token = null;
        state.loading = false;

        // If token invalid → clean storage
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
      });
  },
});

// ---------------------------------------------------------
export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
