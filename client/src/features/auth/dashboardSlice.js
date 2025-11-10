import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../utils/api";

export const fetchDashboard = createAsyncThunk(
  "dashboard/fetchDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get("/admin/dashboard");
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error fetching dashboard data");
    }
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState: {
    totalEmployees: 0,
    jobApplicants: 0,
    attendance: { total: 0, onTime: 0, late: 0, absent: 0 },
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.totalEmployees = action.payload.totalEmployees;
        state.jobApplicants = action.payload.jobApplicants;
        state.attendance = action.payload.attendance;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export default dashboardSlice.reducer;